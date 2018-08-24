'use strict';

const walk = require('walk-promise'),
  yaml = require('js-yaml'),
  fs = require('fs'),
  _ = require('lodash'),
  topicPrefix = process.env.CLAY_BUS_NAMESPACE || 'clay',
  redis = require('redis'),
  eventHandlers = [
    require('./publish')
  ],
  CLAY_TOPICS = [
    'publishPage'
  ],
  settings = {};

var SUBSCRIBER;

function configureBus() {
  if (process.env.REDIS_BUS_HOST) {
    SUBSCRIBER = redis.createClient(process.env.REDIS_BUS_HOST);

    CLAY_TOPICS.forEach(topic => SUBSCRIBER.subscribe(`${topicPrefix}:${topic}`));

    SUBSCRIBER.on('message', (topic, payload) => {
      const event = topic.split(':')[1];

      eventHandlers.forEach(handler => {
        const fn = handler[event];

        if (fn) {
          fn(JSON.parse(payload), settings);
        }
      });
    });
  }
}

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
        .map(function (key) {
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
    })
    .then(configureBus);
  return settings;
}

module.exports = config;
module.exports.settings = settings;
