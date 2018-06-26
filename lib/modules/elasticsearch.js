'use strict';

const elasticsearch = require('elasticsearch'),
  prdClient = new elasticsearch.Client({
    host: 'elastic.prd.aws.nymetro.com:9200'
  }),
  stgClient = new elasticsearch.Client({
    host: 'elastic.stg.aws.nymetro.com:9200' // TODO: Set as env var
    // log: 'trace'
  }),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  _ = require('highland'),
  request = require('request'),
  _omit = require('lodash/omit'),
  JSONStream = require('JSONStream');

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
      Host: 'www.vulture.com',
      'X-forwarded-host': 'www.vulture.com'
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
 * Get back documents from Elasticsearch based on a provided field name
 * Pass documents through the classifier
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  console.log('argv', argv);
  const pageSize = '200',
    es_stream = new ElasticsearchScrollStream(prdClient, {
      index: 'published-articles',
      type: '_doc',
      scroll: '5s',
      size: pageSize,
      body: {
        query: {
          bool : {
            filter: {
              prefix: {pageUri: 'www.vulture.com'}
            },
            must: {
              term: { tags : "comedy" }
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
      let itemId = item._id.replace('www.vulture.com', 'splitsider-nl.vulture.sites.aws.nymetro.com'),
        data = _omit(item, '_id');

      data.canonicalUrl = item.canonicalUrl.replace('www.vulture.com', 'splitsider-nl.vulture.sites.aws.nymetro.com');

      return stgClient.bulk({
        body: [
          { index:  { _index: 'splitsider-nl_published-articles_v1', _type: '_doc', _id: itemId  } },
          data,
        ]
      }, function (err, resp) {
        console.log('what is the error here', err);
        console.log('resp', resp.errors);
      });
    });
}

module.exports.get = get;
