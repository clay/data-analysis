'use strict';

const LanguageServiceClient = require('@google-cloud/language').LanguageServiceClient,
  language = new LanguageServiceClient();

function analyze(module, data, argv) {
  const { bigQuery } = module,
    document = {
      content: data,
      type: 'PLAIN_TEXT',
    },
    field = argv.f;

  language
    .analyzeEntities({document: document})
    .then(results => {
      const entities = results[0].entities;
      let obj = {};

      entities.forEach(entity => {
        obj[field] = data;
        obj.entityName = entity.name;
        obj.entityType = entity.type;
        obj.entitySalience = entity.salience;
      });
      return bigQuery.insert(argv, obj);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports.analyze = analyze;