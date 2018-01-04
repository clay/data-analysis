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
function contentClassification(data, argv) {
    let fieldToAnalyze = data.ops[0].analyze || argv.f;
    const document = {
      content: fieldToAnalyze,
      type: 'PLAIN_TEXT',
    };

  language
    .classifyText({document: document})
    .then(results => {
      const classification = results[0];

      // Only store rows in BQ if categories are detected
      if (classification.categories.length > 0) {
        classification.categories.forEach(category => {
          fieldToAnalyze = fieldToAnalyze.toString(); // Store as string
          data.ops[0].category = category.name;
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

module.exports.contentClassification = contentClassification;