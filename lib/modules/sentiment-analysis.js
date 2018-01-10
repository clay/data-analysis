'use strict';

const LanguageServiceClient = require('@google-cloud/language').LanguageServiceClient,
  language = new LanguageServiceClient(),
  bigQuery = require('./big-query');

/**
 * Analyze the sentiment of a BigQuery data field

 * @param {Object} module
 * @param {String} data A row of data from BigQuery
 * @param {Object} argv Arguments provided
 */
function analyze(data) {
  const document = {
    content: data.ops[0].analyze,
    type: 'PLAIN_TEXT',
  };

  language
    .analyzeSentiment({document: document})
    .then(results => {
      //console.log('what is document', document);
      const sentiment = results[0].documentSentiment;

      data.ops[0].analyze = data.ops[0].analyze.toString();
      data.ops[0].sentimentScore = sentiment.score;
      data.ops[0].sentimentMagnitude = sentiment.magnitude;

      return bigQuery.insert(data);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports = analyze;