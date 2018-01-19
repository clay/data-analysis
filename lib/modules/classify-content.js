'use strict';

const LanguageServiceClient = require('@google-cloud/language').v1beta2.LanguageServiceClient,
  language = new LanguageServiceClient(),
  bigQuery = require('./big-query'),
  log = require('../log.js');


/**
 * Classify content based off of the `analyze` property and insert to BigQuery

 * @param {Object} data
 * @returns {Object} data
 */
function analyze(data) {
  const document = {
      content: data.ops[0].analyze,
      type: 'PLAIN_TEXT',
    },
    wordCount = document.content.match(/(\w+)/g);

  // At least 20 tokens (words) must be supplied to a document
  if (wordCount.length > 20) {
    language
      .classifyText({document: document})
      .then(results => {
        const classification = results[0];

        classification.categories.forEach(category => {
          data.ops[0].category = category.name;
          data.ops[0].categoryConfidence = category.confidence;
        });

        data.ops[0].analyze = data.ops[0].analyze.toString(); // Store as string to match the data type

        return bigQuery.insert(data);
      })
      .catch(err => {
        log('warn', err);
      });
  } else {
    data.ops[0].analyze = data.ops[0].analyze.toString();

    return bigQuery.insert(data);
  }
}

module.exports = analyze;
