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
    .analyzeSentiment({document: document})
    .then(results => {
      const sentences = results[0].sentences;
      let obj = {};

      sentences.forEach(sentence => {
        obj[field] = data;
        obj.sentimentScore = sentence.sentiment.score;
        obj.sentimentMagnitude = sentence.sentiment.magnitude;
      });
      return bigQuery.insert(argv, obj);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

module.exports.analyze = analyze;