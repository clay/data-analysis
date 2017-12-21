'use strict';

const LanguageServiceClient = require('@google-cloud/language').v1beta2.LanguageServiceClient,
  language = new LanguageServiceClient(),
  bigQuery = require('./big-query');

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

/**
 * Generate categories from a BigQuery data field

 * @param {Object} module
 * @param {Object} argv Arguments provided
 * @param {String} data A row of data from BigQuery
 */
function contentClassification(data) {
  console.log('here is our data', JSON.stringify(data, null, 4));
    const document = {
      content: data.ops[0].description,
      type: 'PLAIN_TEXT',
    };

  language
    .classifyText({document: document})
    .then(results => {
      const classification = results[0];

      // Only store rows in BQ if categories are detected
      if (classification.categories.length > 0) {
        classification.categories.forEach(category => {
          data.ops[0].category = category.name;
          data.ops[0].description = data.ops[0].description[0]; // Store as string
          data.ops[0].categoryConfidence = category.confidence;

          return bigQuery.insert(data);
/*          data.ops = _map(data.ops, function(op) {
            op.category = category.name;
            op.categoryConfidence = category.confidence;
            return op;
          });*/
        });
      }
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports.analyze = analyze;
module.exports.contentClassification = contentClassification;