'use strict';

module.exports = function (module) {
  let cmd = {};

  cmd.command = 'nlp';
  cmd.desc = 'Parses data based on a specified NLP feature and stores the parsed data into a BigQuery table';
  cmd.builder = {
    from: {
      alias: 'fr',
      example: '--from dataset.tableName',
      describe: 'The dataset and table where the data lives',
      demand: true
    },
    to: {
      alias: 't',
      example: '--to dataset.tableName',
      describe: 'The dataset and table to stream parsed data to. This will be created if it doesn\'t already exist',
      demand: true
    },
    field: {
      alias: 'f',
      example: '--field descriptionField', // TODO: allow for multiple fields
      describe: 'BigQuery data to parse, based on field name',
      demand: true
    },
    feature: {
      alias: 'fe',
      example: '--feature contentClassification', // TODO: figure out better options for features - currently is camelCasing modules - contentClassification, entityAnalysis, sentimentAnalysis
      describe: 'The Natural Language feature to use',
      demand: true
    },
    limit: {
      alias: 'l',
      example: '--limit 10',
      describe: 'Limit of returned rows',
      demand: true
    }
  };
  cmd.handler = function (argv) {
    let query = `select ${argv.f} from ${argv.fr} limit ${argv.l}`,
      { bigQuery } = module;

    bigQuery.get(module, query, argv);
  };

  return cmd;
};



