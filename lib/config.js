'use strict';
const walk = require('walk-promise'),
  yaml = require('js-yaml'),
  path = require('path'),
  fs = require('fs'),
  _find = require('lodash/find'),
  settings = {};

/**
 * Walk the directory tree to set config from options
 * @param {object} opts
 * @returns {Object}
 */
function config(opts) {
  settings.keyfile = opts.keyFile;
  settings.projectId = require(`${settings.keyfile}`).project_id;
  settings.modules = [];

  walk(`${opts.projectDir}/tasks`)
    .then(function (files) {
    	_find(files, function (file) {
    		let filePath = `${file.root}/${file.name}`,
          task = file.root.split('/').pop();

          settings.task = task;
          
        // BigQuery schema files
    		if (path.extname(file.name) === '.yml') {
    			settings.schema = yaml.safeLoad(fs.readFileSync(`${filePath}`, 'utf8'));
    		} else if ((file.name) === 'handler.js') {
          settings.modules.push({ handler: filePath });
    		} else if ((file.name) === 'transform.js') {
          settings.modules.push({ transform: filePath });
        }
    	});
      return settings;
    });
  return settings;
}


module.exports = config;
module.exports.settings = settings;