'use strict';

const elasticsearch = require('elasticsearch'),
  qaClient = new elasticsearch.Client({
    host: 'elastic.prd.aws.nymetro.com:9200' // TODO: Set as env var
    // log: 'trace'
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
  _pick = require('lodash/pick'),
  request = require('request'),
  JSONStream = require('JSONStream');

/**
 * Resolves data refs
 *
 * @param {String} url
 * @returns {Object} request
 */
function resolveRef(url) {
  let replace = url.replace('@published', '');
  return request({
    url: `http://${replace}.json`,
    headers: {
      Host: 'nymag.com',
      'X-forwarded-host': 'nymag.com'
    },
    json:true
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
  var ref = entry._ref.indexOf(`components/${comp}`) !== -1,
    relatedStory = _pick(entry, ['plaintextTitle', 'title', 'content']);

    relatedStory.content = _map(relatedStory.content, obj => _pick(obj, '_ref'));

    return ref ? _pick(entry, ['text', '_version']) : relatedStory;

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
  return stgClient.bulk({
    body: [
      { index:  { _index: 'published-products-test-desc', _type: type, _id: id  } },
      doc,
    ]
  }, function (err, resp) {
    console.log('err', err);
    console.log('resp', resp);
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
  const split = argv.from.split('.'),
    feature = module[argv.fe],
    index = split[0],
    field = argv.f,
    pageSize = '200',
    type = split[1],
    es_stream = new ElasticsearchScrollStream(qaClient, {
      index: index,
      type: type,
      scroll: '5s',
      size: pageSize,
      body: {
        query: {
          prefix: {_id: 'nymag.com/selectall'} // TODO: site pass via args
        }
      }
    }, ['_id']);

  _(es_stream)
    .through(JSONStream.parse())
    .ratelimit(2, 1000)
    .flatMap(function (item) {
      var id = item['_id'],
        url = id.replace('nymag.com', '172.24.17.157');

      return _(resolveRef(url))
        .through(JSONStream.parse())
        .each(function (entry) {
          //console.log('what is entry', entry.content);
          if (entry.content === false) {
            console.log('this is false', id);
          }
          // console.log('what is entry[field]', entry[field])
/*          entry[field] = _map(entry[field], obj => checkRef(obj, 'clay-paragraph'));
          entry.analyze = resolveObj(entry[field]);
          console.log('what is this thing', entry.analyze);*/
          //return feature.analyze(module, argv, entry[field][0], entry.contentChannel, id;
          // return entry;
          // return insert(index, type, id, entry);
        });
    })
/*    .flatMap(function (item) {
      var id = item['_id'],
        url = id.replace('nymag.com', '172.24.17.157');

      return _(resolveRef(url))
        .through(JSONStream.parse())
        .each(function (entry) {
          entry[field] = _map(entry[field], obj => checkRef(obj, 'clay-paragraph'));
          entry.analyze = resolveObj(entry[field]);
          console.log('what is this thing', entry.analyze);
          return feature.analyze(module, argv, entry.analyze[0], entry.productId, id);
          // return insert(index, type, id, entry);
        });
    })*/
    .each(function (item) {
      console.log('DONE!', item);
    });
}

module.exports.get = get;

