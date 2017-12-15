'use strict';
const walk = require('walk-promise'),
	_find = require('lodash/find'),
	settings = {};

function config(opts) {
	settings.keyfile = opts.keyFile;

	walk(`${opts.projectDir}/document`) // TODO: Loop through for different tasks instead of hardcoding
  .then(function(files) {
  	_find(files, function(file) { 
  		let filePath = `${file.root}/${file.name}`;
  		if(file.name === 'index.js') {
  			settings.module = filePath;
  		} else {
  			settings.schema = filePath;
  		}
  	});
  })
}

module.exports = config;
module.exports.settings = settings;