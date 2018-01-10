'use strict';

const _cloneDeep = require('lodash/cloneDeep'),
  settings = require('./config').settings;

/**
* Publish hook
* Streams published data to BigQuery
* @param {Object} data
* @returns {Promise}
*/
function publish(payload) {
  const data = _cloneDeep(payload),
    config = data.config = settings,
    handler = data.config.handler = require(`${data.config.modules[0].handler}`),
    task = data.config.task = require(`./modules/${data.config.task}`);

  return handler.publish(data)
    .then(function (result) {
      return task(result);
    });
}

module.exports = publish;
