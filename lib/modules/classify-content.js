'use strict';

const LanguageServiceClient = require('@google-cloud/language').v1beta2.LanguageServiceClient,
  language = new LanguageServiceClient(),
  bigQuery = require('./big-query');

/**
 * Classify content based off of the `analyze` property and insert to BigQuery

 * @param {Object} data
 */
function analyze(data) {
  const document = {
    content: data.ops[0].analyze,
    type: 'PLAIN_TEXT',
  };

  language
    .classifyText({document: document})
    .then(results => {
      const classification = results[0];

      // Only store category values in BQ if categories are detected
      if (classification.categories.length > 0) {
        classification.categories.forEach(category => {
          data.ops[0].analyze = data.ops[0].analyze.toString(); // Store as string to match the data type
          data.ops[0].category = category.name;
          data.ops[0].categoryConfidence = category.confidence;

          return bigQuery.insert(data);
        });
      } else {
        data.ops[0].analyze = 'No content';
        data.ops[0].category = 'No categories';
        data.ops[0].categoryConfidence = 'No confidence score';

        return bigQuery.insert(data);
      }
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports = analyze;