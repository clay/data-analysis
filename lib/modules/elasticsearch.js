'use strict';

const elasticsearch = require('elasticsearch'),
  client = new elasticsearch.Client({
    host: 'elastic.qa.aws.nymetro.com:9200', // TODO: Set as env var
    log: 'trace'
  }),
  fetch = require('fetch-retry'),
  identity = require('lodash/identity'),
  scrollToEnd = require('../utilites/scroll')(client);

/**
 * Resolve an object key within an object, e.g. [{ref:uri}{ref:uri}] becomes [uri, uri]
 * This assumes the first and only property name
 * @param {[{}]} items
 * @returns {Array}
 */
function resolveObjProperty(items) {
  return items.reduce((arr, item) => arr.concat(item[Object.keys(item)[0]]), []);
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
    type = split[1];

  client.search({
    scroll: '10s',
    index: index,
    type: type,
    size: argv.l,
    body: {
      query: {
        prefix: {_id: 'nymag.com/strategist'} // TODO: site pass via args
      }
    }
  })
	  .then(scrollToEnd(identity, []))
	  .then(results => results.map(urls => Promise.all(urls._source.description.map(desc => fetch(`http://${desc.replace('nymag.com', '172.24.17.157')}`, {
	        retries: 3,
	        retryDelay: 1000,
	      headers: {
	        Host: 'nymag.com',
	        'X-forwarded-host': 'nymag.com'
	      }
	    })
	  .then(resp => resp.json())))
	  .then(data => resolveObjProperty(data))
	  .then(stream => {
	    let doc = stream[0];

	    return feature.analyze(module, doc, argv);
	  	}
      )));
}

module.exports.get = get;