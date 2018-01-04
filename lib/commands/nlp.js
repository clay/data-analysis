'use strict';

function builder(yargs) {
  return yargs
    .options({
      service: {
        alias: 's',
        example: '--service elasticsearch',
        describe: 'Elasticsearch data source',
        demandOption: true
      },
      from: {
        alias: 'fr',
        example: '--from index.type',
        describe: 'The Elasticsearch index and type',
        demandOption: true
      },
      to: {
        alias: 't',
        example: '--to dataset.tableName',
        describe: 'The BigQuery dataset and table to stream parsed data to. This will be created if it doesn\'t already exist',
        demandOption: true
      },
      schema: {
        alias: 'sc',
        example: '--to schema.json',
        describe: 'The JSON schema to pass to BigQuery',
        demandOption: true
      },
      field: {
        alias: 'f',
        example: '--field descriptionField', // TODO: allow for multiple fields
        describe: 'Data to analyze, based on property/field name',
        demandOption: true
      },
      feature: {
        alias: 'fe',
        example: '--feature contentClassification',
        example: '--feature sentimentAnalysis',
        describe: 'The NLP feature to use',
        demandOption: true
      }
    });
}

module.exports = function (module) {
  let obj = {
    command: 'nlp',
    desc: 'Streams NLP data to BigQuery from Elasticsearch',
    builder,
    handler: function (argv) {
      let service = module[argv.s];

      service.get(module, argv);
    }
  };

  return obj;
};

