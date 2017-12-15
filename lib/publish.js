'use strict';
const yaml = require('js-yaml'),
  fs = require('fs'),
  bigquery = require('./modules/big-query'),
  config = require('./config').settings;


function init(data, config) {
  let projectId = require(`${keyfile}`).project_id,
  	schemaJson = yaml.safeLoad(fs.readFileSync(`${schema}`, 'utf8'));

  return bigquery.insert(data, config, schemaJson, projectId);
}

function publish(payload) {
  return init(payload, config);
}


module.exports = publish;
module.exports.init = init;