'use strict';

const clayLog = require('clay-log'),
  _defaults = require('lodash/defaults');

/**
 * Call this function in specific files to get a logging
 * instance specific to that file. Handy for adding
 * the filename or any other file specific meta information
 *
 * @param  {Object} meta
 * @return {Function}
 */
function setup(meta) {
  meta = _defaults({}, meta, {file: 'File not specified! Please declare a file'});

  return clayLog.init({
    name: 'data-analysis',
    meta: meta
  });
}

module.exports = setup;
