'use strict';

var curry = require('lodash/curry');

module.exports = function (client) {
  var scrollToEnd = curry(function (resultTransform, results, res) {
    results = results.concat(resultTransform(res.hits.hits));

    if (results.length < res.hits.total) {
      return client.scroll({
        scrollId: res._scroll_id,
        scroll: '10s'
      })
        .then(scrollToEnd(resultTransform, results));
    } else {
      return results;
    }
  });

  return scrollToEnd;
};