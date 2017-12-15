'use strict';

const LanguageServiceClient = require('@google-cloud/language').LanguageServiceClient,
  language = new LanguageServiceClient();

/**
 * Analyze the sentiment of a BigQuery data field

 * @param {Object} module
 * @param {String} data A row of data from BigQuery
 * @param {Object} argv Arguments provided
 */
function analyze(module, argv, data) {
  const { bigQuery } = module,
    document = {
      content: data.text,
      type: 'PLAIN_TEXT',
    },
    field = argv.f;

  language
    .analyzeSentiment({document: document})
    .then(results => {
      //console.log('what is document', document);
      const sentiment = results[0].documentSentiment;
      let obj = {};
      obj.articleUri = data.articleUri;
      obj.rubric = data.rubric;
      obj.featureTypes = data.featureTypes;
      obj.canonicalUrl = data.canonicalUrl;
      obj.contentChannel = data.contentChannel;
      obj.sentimentScore = sentiment.score;
      obj.sentimentMagnitude = sentiment.magnitude;

      //console.log('what is obj', obj);
      return bigQuery.insert(argv, obj);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports.analyze = analyze;