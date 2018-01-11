'use strict';

const _cloneDeep = require('lodash/cloneDeep'),
  _each = require('lodash/each'),
  _filter = require('lodash/filter'),
  settings = require('./config').settings;

/**
* Publish hook
* Streams published data to a feature task
* @param {Object} payload
*/
function publish(payload) {
  _each(settings.tasks, function (item) {
    let data = _cloneDeep(payload),
      task = require(`./modules/${item.task}`),
      taskObj = _filter(settings.tasks, ['task', item.task]),
      handler = require(item.handler);

    data.config = taskObj;

    return handler.publish(data)
      .then(function (result) {
        return task(result);
      });
  });
}

module.exports = publish;
