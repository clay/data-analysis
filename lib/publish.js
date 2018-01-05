'use strict';

const _cloneDeep = require('lodash/cloneDeep'),
  task = require('./modules/classify-content'),
  config = require('./config').settings;

/**
 * Publish hook
 * Streams published data to BigQuery
 * @param {Object} data
 * @returns {Promise}
 */
function publish(data) {
  const handler = require(`${config.modules[0].handler}`),
	 clone = _cloneDeep(data);

  clone.config = config;

  return handler.publish(_cloneDeep(clone))
    .then(function (result) {
      return task(JSON.parse(result[0]));
    });
}

module.exports = publish;
