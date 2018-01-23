'use strict';

const LanguageServiceClient = require('@google-cloud/language').LanguageServiceClient,
  language = new LanguageServiceClient(),
  bigQuery = require('./big-query'),
  log = require('../log.js')({ file: __filename });

/**
 * Analyze the sentiment of content based off of the `analyze` property and insert to BigQuery

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
      .analyzeSentiment({document: document})
      .then(results => {
        const sentiment = results[0].documentSentiment;

        data.ops[0].analyze = data.ops[0].analyze.toString();
        data.ops[0].sentimentScore = sentiment.score;
        data.ops[0].sentimentMagnitude = sentiment.magnitude;

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