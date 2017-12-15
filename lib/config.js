'use strict';
const walk = require('walk-promise'),
	_find = require('lodash/find'),
	init = require('./init');

function config(opts) {
	const keyfile = opts.keyFile;
	let module, 
		schema;

	walk(`${opts.projectDir}/content-classification`) // TODO: Loop through for different tasks instead of hardcoding
  .then(function(files) {
  	_find(files, function(file) { 
  		let filePath = `${file.root}/${file.name}`;
  		if(file.name === 'index.js') {
  			module = filePath;
  		} else {
  			schema = filePath;
  		}
  	});
  	return init(module, schema, keyfile);
  })
}

module.exports = config;
