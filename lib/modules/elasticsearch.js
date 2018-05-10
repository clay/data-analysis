'use strict';

const elasticsearch = require('elasticsearch'),
  qaClient = new elasticsearch.Client({
    host: 'elastic.prd.aws.nymetro.com:9200'
  }),
  stgClient = new elasticsearch.Client({
    host: 'elastic.stg.aws.nymetro.com:9200' // TODO: Set as env var
    // log: 'trace'
  }),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  stripTags = require('striptags'),
  _ = require('highland'),
  _map = require('lodash/map'),
  _compact = require('lodash/compact'),
  _omit = require('lodash/omit'),
  _pick = require('lodash/pick'),
  _keys = require('lodash/keys'),
  _pickBy = require('lodash/pickBy'),
  _filter = require('lodash/filter'),
  request = require('request'),
  JSONStream = require('JSONStream'),
  btoa = require('btoa');

/**
 * Resolves data refs
 *
 * @param {String} url
 * @returns {Object} request
 */
function resolveRef(url) {
var options = {
    url: url,
    headers: {
      Host: 'nymag.com',
      'X-forwarded-host': 'nymag.com'
    },
    json:false
  };

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log('info', body);
  }
}

return request(options, callback);

}


/**
 * Resolves data refs
 *
 * @param {String} url
 * @returns {Object} request
 */
function putRef(url) {
  return request({
    url: url,
    method: 'PUT',
    headers: {
      Host: 'nymag.com',
      'X-forwarded-host': 'nymag.com',
      Authorization: 'Token 4abd72dafc9e41e7f24bb39dc43b9013'
    },
    json:{}
  });
}




/**
 * For components with description fields, resolve properties
 *
 * @param {Object} entry Object with resolved data
 * @param {String} comp Component
 * @returns {Object}
 */
function checkRef(entry, comp) {
  if (entry && entry._ref) {
  var ref = entry._ref.indexOf(`components/${comp}`) !== -1,
    relatedStory = _pick(entry, ['plaintextTitle', 'title', 'content']);

    relatedStory.content = _map(relatedStory.content, obj => _pick(obj, '_ref'));

    return ref ? _pick(entry, ['text', '_version']) : relatedStory;
  }
  
  return entry;
}


/**
 * Resolve object values, e.g. [{text:tag}{text:tag}] becomes [tag, tag]
 * @param {[{}]} items
 * @returns {Array}
 */
function resolveObj(items) {
  return items.reduce((arr, item) => {
      return arr.concat(stripTags(item.text));
  }, []);
}


/**
 * Bulk inserts documents into an Elasticsearch index
 *
 * @param {String} index Elasticsearch index
 * @param {String} type Elasticsearch type
 * @param {String} id Elasticsearch document _id
 * @param {Object} doc Elasticsearch document
 * @returns {Object} doc
 */
function insert(index, type, id, doc) {
  console.log('what is doc', doc);
  return stgClient.bulk({
    body: [
      { index:  { _index: index, _type: type, _id: id  } },
      doc,
    ]
  }, function (err, resp) {
    console.log('what is the error here', err);
    console.log('resp', resp.errors);
  });
}


/**
 * Get back documents from Elasticsearch based on a provided field name
 * Pass documents through the classifier
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  console.log('argv', argv);
  const split = argv.from.split('.'),
    feature = module[argv.fe],
    index = split[0],
    field = argv.f,
    pageSize = '200',
    type = split[1],
    es_stream = new ElasticsearchScrollStream(qaClient, {
      index: 'published-articles',
      type: '_doc',
      scroll: '5s',
      size: pageSize,
      body: {      
        query: {
          bool : {
            filter: {
              prefix: {pageUri: 'nymag.com/strategist'}
            }
          }
        },
        sort: {
          "date": "desc"
        }       
      }
    }, ['_id']);

  _(es_stream)
    .through(JSONStream.parse())
    .ratelimit(1, 1000)
    .each(function (item) {
      console.log('what is item', item);
      let itemId = item._id.replace('nymag.com', 'newsletter-feed.nymag.sites.aws.nymetro.com'),
        data = _omit(item, '_id');

        data.canonicalUrl = item.canonicalUrl.replace('nymag.com', 'newsletter-feed.nymag.sites.aws.nymetro.com');

        console.log('what is data', data);

      return stgClient.bulk({
        body: [
          { index:  { _index: 'newsletter-feed_published-articles_v1', _type: '_doc', _id: itemId  } }, 
          data,
        ]
      }, function (err, resp) {
        console.log('what is the error here', err);
        console.log('resp', resp.errors);
      });
      //insert('newsletter-feed_published-articles_v1', '_doc', itemId, item)
    });
/*    .flatMap(function (item) {
      console.log('what is item', item);
      return item;
    })*/

/*    .flatMap(function (item) {
      // console.log('what is item', item);
      var id = item['_id'],
        url = id.replace('www.grubstreet.com', '172.24.17.157');

      return _(resolveRef(url))
        .through(JSONStream.parse())
        .each(function (entry) {
          let desc = _map(entry.content, obj => _map(obj.description, desc => checkRef(desc, 'clay-paragraph')));
          entry[field] = _map(entry[field], obj => checkRef(obj, 'clay-paragraph'));

          //entry.analyze = resolveObj(entry[field]);
          //console.log('what is this thing', entry.analyze);
          //return feature.analyze(module, argv, entry.analyze[0], entry.productId, id);
          return insert('published-products-test-desc', type, id, entry);
        });
    })*/
}

module.exports.get = get;

