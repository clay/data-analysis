#!/usr/bin/env node
'use strict';

const yargs  = require('yargs'),
  { commands } = require('../index.js');

commands.forEach(cmd => yargs.command(cmd.command, cmd.desc, cmd.builder, cmd.handler));

yargs
  .help()
  .version()
  .demandCommand(1, 'Your wish is my command')
  .completion()
  .argv;
