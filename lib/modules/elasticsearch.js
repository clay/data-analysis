'use strict';

const elasticsearch = require('elasticsearch'),
  client = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_HOST
  }),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  h = require('highland'),
  request = require('request'),
  JSONStream = require('JSONStream'),
  yaml = require('js-yaml'),
  stripTags = require('striptags'),
  fs = require('fs');


/**
 * Resolves an Elasticsearch document id, e.g. /components/article/instances/cj0l2ym5n00b81nyegapm9jb1
 *
 * @param {String} id
 * @returns {Stream} response
 */
function resolveRef(id) {
  return request
    .get({url: `http://${id}.json`,
      json:true})
    .on('error', function (err) {
      console.log(err);
    });
}


/**
 * Pass retrieved docs from Elasticsearch to a task
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  const schema = yaml.safeLoad(fs.readFileSync(argv.sc, 'utf8')),
    feature = module[argv.fe],
    index = argv.from.split('.')[0],
    type = argv.from.split('.')[1],
    dataset = argv.to.split('.')[0],
    table = argv.to.split('.')[1],
    field = argv.f,
    query = fs.readFileSync(argv.q, 'utf8'),
    pageSize = '100',
    es_stream = new ElasticsearchScrollStream(client, {
      index: index,
      type: type,
      scroll: '5s',
      size: pageSize,
      body: query
    }, ['_id']);

  h(es_stream)
    .through(JSONStream.parse())
    .ratelimit(1, 1000)
    .flatMap(function (item) {
      const id = item['_id'].replace('nymag.com', '172.24.17.157');

      return h(resolveRef(id))
        .through(JSONStream.parse())
        .filter(function (item) {
          const content = item[field];

          return h(content)
            // Always assume content fields have a 'text' property
            .pluck('text').toArray(function (text) {
              return h(text)
                .compact() // Remove falsy values from the stream
                .toArray(function (result) {
                  let analyze = stripTags(result.toString()),
                    data = {
                      ops: [{ analyze }],
                      config: { schema, dataset: dataset, table: table }
                    };

                  return feature(data);
                });
            });
        });
    })
    .each(item => console.log('DONE!', item));
}

module.exports.get = get;