'use strict';

const elasticsearch = require('elasticsearch'),
  client = new elasticsearch.Client({
    host: 'elastic.prd.aws.nymetro.com:9200'
  }),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  h = require('highland'),
  _ = require('lodash'),
  request = require('request'),
  JSONStream = require('JSONStream'),
  yaml = require('js-yaml'),
  stripTags = require('striptags'),
  fs = require('fs');

/**
 * Resolves data refs
 *
 * @param {String} url
 * @returns {Object} request
 */
function resolveRef(url) {
  return request
    .get({url: `http://${url}.json`,
    headers: {
      Host: 'nymag.com',
      'X-forwarded-host': 'nymag.com'
    },
    json:true})
    .on('error', function(err) {
      console.log(err);
    })
}

/**
 * Get all of the name properties from a BigQuery schema template
 *
 * @param  {Object} config
 * @returns {Array}
 */
function getSchemaFields(config) {
  return _.map(_.get(config, 'schema.fields'), 'name');
}


/**
 * Pass retrieved docs from Elasticsearch to a task
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  const split = argv.from.split('.'),
    schema = yaml.safeLoad(fs.readFileSync(argv.sc, 'utf8')),
    schemaProps = getSchemaFields(schema),
    feature = module[argv.fe],
    index = split[0],
    field = argv.f,
    pageSize = '100',
    type = split[1],
    es_stream = new ElasticsearchScrollStream(client, {
      index: index,
      type: type,
      scroll: '5s',
      size: pageSize,
      body: {      
        query: {
          bool : {
            filter: {
              prefix: {_id: "nymag.com/strategist"}
            },
            must: {
                // Never include original videos in analysis
                match: {
                  "featureTypes.Video-Original": false
                }
            }
          }
        }       
      }
    }, ['_id']);

  h(es_stream)
    .through(JSONStream.parse())
    .ratelimit(1, 1000)
    .flatMap(function (item) {
      console.log('what is pageUri', item['_id']);
      var pageUri = item.pageUri,
        id = item['_id'].replace('nymag.com', '172.24.17.157');

      return h(resolveRef(id))
        .through(JSONStream.parse()) 
        .filter(function (item) {
          // If an item has a description obj, append it to the end of our stream
          let content = item[field],
            text;

          if (content[0].description) {
            text = h(content).append(content[0].description[0]);
          } else {
            text = h(content)
          }

          return h(text)
            .pluck('text').toArray(function (text) {
              return h(text)
                .compact() // Remove falsy values from the stream
                .toArray(function (result) {
                  let analyze = stripTags(result.toString()),
                    data = {
                      ops: [{analyze, contentChannel: item.contentChannel, site: 'Strategist', pageUri: pageUri}],
                      config: { schema }
                    }; 

                  return feature.contentClassification(data);
                })
            })
          
        })
    })
    .each(item => console.log('DONE!', item))
}




module.exports.get = get;

