'use strict';

const LanguageServiceClient = require('@google-cloud/language').v1beta2.LanguageServiceClient,
  language = new LanguageServiceClient();

/**
 * Generate categories from a BigQuery data field

 * @param {Object} module
 * @param {Object} argv Arguments provided
 * @param {String} data A row of data from BigQuery
 */
function analyze(module, argv, data) {
  console.log(JSON.stringify(data, null, 4));
  const { bigQuery } = module,
    document = {
      content: data,
      type: 'PLAIN_TEXT',
    },
    field = argv.f;

  language
    .classifyText({document: document})
    .then(results => {
      const classification = results[0];
      let obj = {};

      // Only store rows in BQ if categories are detected
      if (classification.categories.length > 0) {
        classification.categories.forEach(category => {
          obj[field] = data;
          obj.productId = '';
          obj.productCategory = category.name;
          obj.productCategoryConfidence = category.confidence;
        });
        return bigQuery.insert(argv, obj);
      }
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports.analyze = analyze;