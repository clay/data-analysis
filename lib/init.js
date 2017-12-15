'use strict';
const yaml = require('js-yaml'),
	fs = require('fs'),
	bigquery = require('./modules/big-query');


function init(module, schema, keyfile) {
	let projectId = require(`${keyfile}`).project_id,
		schemaJson = yaml.safeLoad(fs.readFileSync(`${schema}`, 'utf8'));

	return bigquery.getStream(module, schemaJson, keyfile, projectId);
	/*console.log('what is module', readFile(module));
	console.log('what is schema', readFile(schema));
	console.log('what is keyfile',readFile(keyfile));*/
	//return Promise.all([readFile(module), readFile(schema), readFile(keyfile)]);
}

module.exports = init;