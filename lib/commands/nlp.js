'use strict';

function builder(yargs) {
  return yargs
    .option('from', {
      alias: 'fr',
      example: '--from dataset.tableName',
      describe: 'The dataset and table where the data lives',
      demand: true
    })
    .option('to', {
      alias: 't',
      example: '--to dataset.tableName',
      describe: 'The dataset and table to stream parsed data to. This will be created if it doesn\'t already exist',
      demand: true
    })
    .option('field', {
      alias: 'f',
      example: '--field descriptionField', // TODO: allow for multiple fields
      describe: 'BigQuery data to parse, based on field name',
      demand: true
    })
    .option('feature', {
      alias: 'fe',
      example: '--feature contentClassification', // TODO: figure out better options for features - currently is camelCasing modules - contentClassification, entityAnalysis, sentimentAnalysis
      describe: 'The Natural Language feature to use',
      demand: true
    })
    .option('limit', {
      alias: 'l',
      example: '--limit 10',
      describe: 'Limit of returned rows',
      demand: true
    });
}

module.exports.cmd = function (module) {
  let obj = {
    command: 'nlp',
    desc: 'Parses data based on a specified NLP feature and stores the parsed data',
    builder,
    handler: function (argv) {
      let query = `select ${argv.f} from ${argv.fr} limit ${argv.l}`,
        { bigQuery } = module;

      bigQuery.get(module, query, argv);
    }
  };

  return obj;
};

