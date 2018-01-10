'use strict';
const walk = require('walk-promise'),
  yaml = require('js-yaml'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  settings = {};

/**
 * Walk the directory tree to set config from options
 * @param {object} opts
 * @returns {Object}
 */
function config(opts) {
  settings.tasks = {};

  walk([`${opts.projectDir}/tasks`], {
    ignore: [`${opts.projectDir}/tasks/utils.js`]
  })
    .then(function (files) {
      let tasks = _(files)
        .map('root')
        .uniq()
        .map(function(key) { 
          return {
            key: key, 
            task: key.split('/').pop(),
            schema: yaml.safeLoad(fs.readFileSync(`${key}/schema.yml`, 'utf8')),
            handler: `${key}/handler.js`,
            transform: `${key}/transform.js`
          };
        })
        .value();

      settings.tasks = tasks;

      return settings;
    });
  return settings;
}

module.exports = config;
module.exports.settings = settings;