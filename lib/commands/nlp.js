'use strict';

function builder(yargs) {
  return yargs
    .options({
      service: {
        alias: 's',
        example: '--service bigQuery',
        example: '--service elasticsearch',
        describe: 'The data source',
        demandOption: true
      },
      from: {
        alias: 'fr',
        example: '--from dataset.tableName',
        example: '--from index.type',
        describe: 'Configuration for pulling data from a service, e.g. where the data lives within the service',
        demandOption: true
      },
      to: {
        alias: 't',
        example: '--to dataset.tableName',
        describe: 'The BigQuery dataset and table to stream parsed data to. This will be created if it doesn\'t already exist',
        demandOption: true
      },
      field: {
        alias: 'f',
        example: '--field descriptionField', // TODO: allow for multiple fields
        describe: 'Data to parse, based on property/field name',
        demandOption: true
      },
      feature: {
        alias: 'fe',
        example: '--feature contentClassification',
        example: '--feature sentimentAnalysis',
        describe: 'The NLP feature to use',
        demandOption: true
      },
      limit: {
        alias: 'l',
        example: '--limit 10',
        describe: 'Limit of returned rows/documents',
        default: 10
      }
    });
}

module.exports = function (module) {
  let obj = {
    command: 'nlp',
    desc: 'Streams NLP data to BigQuery from a specified data source',
    builder,
    handler: function (argv) {
      let service = module[argv.s];

      service.get(module, argv);
    }
  };

  return obj;
};

