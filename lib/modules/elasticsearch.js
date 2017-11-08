'use strict';

const elasticsearch = require('elasticsearch'),
  client = new elasticsearch.Client({
    host: 'elastic.qa.aws.nymetro.com:9200',
    log: 'trace'
  }),
  // fetch = require('node-fetch'),
  _map = require('lodash/map'),
  _get = require('lodash/get'),
  _pick = require('lodash/pick');


/**
 * Get back documents from Elasticsearch based on a provided field name
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  const split = argv.from.split('.'),
  	feature = module[argv.fe],
    index = split[0],
   	type = split[1],
   	field = argv.f;

  client.search({
	  index: index,
	  type: type,
	  size: argv.l,
	  body: {
	    query: {
	    	bool: {
	    		must: [
	    			{ prefix: { _id: 'nymag.com/strategist' }} // TODO: pass in site via arg
	    		],
		      filter: {
		        exists: { field: field }
		      }
	    	}
	    }
	  }
  })
    .then(results => _map(_get(results, 'hits.hits'), source => _pick(source, `_source.${field}`)))
    .then(results => _map(results, function (value) {
		  let param = `${value}._source.${field}`;

      return feature.analyze(module, param, argv);
	   }));
}

module.exports.get = get;

