'use strict';

const { join, resolve } = require('path'),
  glob = require('require-glob'),
  publish = require('./lib/publish'),
  config = require('./lib/config'),
  modNames = glob.sync(['./lib/modules/*.js']),
  cmdNames = glob.sync(['./lib/commands/*.js']);

// Define our internal and external dependencies and bind them to our commands
let internals = {},
  deps = { join, resolve, process, internals },
  commands;

Object.keys(modNames).forEach(module => {
  deps.internals[module] = modNames[module];
});

commands = Object.keys(cmdNames).map((cmd) => cmdNames[cmd](deps.internals));

module.exports = {
  commands,
  config: config,
  modules: deps.internals
};
