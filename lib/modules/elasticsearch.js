'use strict';

const elasticsearch = require('elasticsearch'),
  client = new elasticsearch.Client({
    host: 'elastic.qa.aws.nymetro.com:9200', // TODO: Set as env var
    log: 'trace'
  }),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  _ = require('highland'),
  fetch = require('fetch-retry');

/**
 * Resolve data refs so we can pass them through the classifier
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 * @param  {String} data Object ref
 * @returns {Promise}
 */
function resolveField(module, argv, data) {
  const URL = data.replace('nymag.com', 'http://172.24.17.157'),
    feature = module[argv.fe];

  return fetch(URL, {
    retries: 3,
    retryDelay: 1000,
    headers: {
      Host: 'nymag.com',
      'X-forwarded-host': 'nymag.com'
    }
  })
    .then(res=>res.json())
    .then(res=> feature.analyze(module, argv, res.text))
    .catch(err => console.log('err', err));
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
    index = split[0],
    field = argv.f,
    pageSize = '200',
    type = split[1],
    es_stream = new ElasticsearchScrollStream(client, {
      index: index,
      type: type,
      scroll: '5s',
      size: pageSize,
      body: {
        query: {
          prefix: {_id: 'nymag.com/strategist'} // TODO: site pass via args
        }
      }
    }, ['_id', '_score']);


  _(es_stream)
    .map(JSON.parse)
    .flatMap(function (item) {
      return _(item[field]).flatMap(function (field) {
        return _(resolveField(module, argv, field));
      });
    })
    .collect()
    .map(function (field) {
      item[field] = field;
      return field;
    })
    .tap(console.log)
    .done(data => console.log('Done!', data));
}

module.exports.get = get;


