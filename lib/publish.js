'use strict';
const _cloneDeep = require('lodash/cloneDeep'),
  bigquery = require('./modules/big-query'),
  config = require('./config').settings;

/**
 * Pass published data to BigQuery
 * @param {Object} data
 * @returns {fn}
 */
function streamToBigQuery(data) {
  return bigquery.insert(data);
}

/**
 * Publish hook
 * @param {Object} data
 * @returns {fn}
 */
function publish(data) {
  let module = require(`${config.modules[0]}`); // TODO: Better way to select for publish module

  data.config = config;

  return streamToBigQuery(module.publish(_cloneDeep(data)));
}


module.exports = publish;
module.exports.streamToBigQuery = streamToBigQuery;