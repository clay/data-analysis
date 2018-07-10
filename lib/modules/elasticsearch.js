'use strict';

const elasticsearch = require('elasticsearch'),
  prdClient = new elasticsearch.Client({
    host: 'elastic.prd.aws.nymetro.com:9200'
  }),
  stgClient = new elasticsearch.Client({
    host: 'elastic.stg.aws.nymetro.com:9200' // TODO: Set as env var
    // log: 'trace'
  }),
  count = require('word-count'),
  stripTags = require('striptags'),
  product = 'components/product',
  video = 'components/video',
  ooyala = 'components/ooyala-player',
  image = 'pixel.nymag.com',
  singleRelatedStory = 'components/single-related-story',
  relatedStory = 'components/related-story',
  urls = require('url'),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  _ = require('highland'),
  _map = require('lodash/map'),
  _compact = require('lodash/compact'),
  _flattenDeep = require('lodash/flattenDeep'),
  _omit = require('lodash/omit'),
  bigQuery = require('./big-query'),
  _get = require('lodash/get'),
  _pick = require('lodash/pick'),
  _keys = require('lodash/keys'),
  _pickBy = require('lodash/pickBy'),
  _filter = require('lodash/filter'),
  request = require('request'),
  JSONStream = require('JSONStream'),
  btoa = require('btoa');

  /**
   * Resolve object values, e.g. [{text:tag}{text:tag}] becomes [tag, tag]
   * @param {[{}]} items
   * @returns {Array}
   */
  function resolveObj(items) {
    return items.reduce((arr, item) => {
      if (item.description && item.description.length > 0) {
        // product components have description fields
        return arr.concat(item.text, item.description[0].text);
      } else {
        return arr.concat(item.text);
      }
    }, []);
  }


  function resolveContentValues(items) {
    return items.reduce((arr, item) => {
        if (item._ref) {
          item = item._ref;
        }
        return arr.concat(JSON.stringify(item));
      }, []);
  }

  /**
   * Resolve a specified object property within article content, e.g. [{ref:uri}{ref:uri}] becomes [uri, uri]
   * @param {[{}]} items
   * @returns {Array}
   */
  function resolveObjProperty(items, property) {
    return items.reduce((arr, item) => arr.concat(item[property]), []);
  }


/**
 * Resolves data refs

/**
 * Resolves data refs
 *
 * @param {String} url
 * @returns {Object} request
 */
function resolveRef(url) {
  console.log('what is url', url);
  return request({
    url: `${url}@published.json`,
    timeout: 120000,
    headers: {
      Host: 'www.thecut.com',
      'X-forwarded-host': 'www.thecut.com'
    },
    json:true
  }, function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  //console.log('body:', body); // Print the HTML for the Google homepage.
  });
}




/**
 * For components with description fields, resolve properties
 *
 * @param {Object} entry Object with resolved data
 * @param {String} comp Component
 * @returns {Object}
 */
function checkRef(entry, comp) {
  if (entry && entry._ref) {
  var ref = entry._ref.indexOf(`components/${comp}`) !== -1,
    relatedStory = _pick(entry, ['plaintextTitle', 'title', 'content']);

    relatedStory.content = _map(relatedStory.content, obj => _pick(obj, '_ref'));

    return ref ? _pick(entry, ['text', '_version']) : relatedStory;
  }

  return entry;
}


/**
 * Resolve object values, e.g. [{text:tag}{text:tag}] becomes [tag, tag]
 * @param {[{}]} items
 * @returns {Array}
 */
function resolveObj(items) {
  return items.reduce((arr, item) => {
      return arr.concat(stripTags(item.text));
  }, []);
}


/**
 * Bulk inserts documents into an Elasticsearch index
 *
 * @param {String} index Elasticsearch index
 * @param {String} type Elasticsearch type
 * @param {String} id Elasticsearch document _id
 * @param {Object} doc Elasticsearch document
 * @returns {Object} doc
 */
function insert(index, type, id, doc) {
  //console.log('what is doc', doc);
  return stgClient.bulk({
    body: [
      { index:  { _index: index, _type: type, _id: id  } },
      doc,
    ]
  }, function (err, resp) {
    console.log('what is the error here', err);
    console.log('resp', resp.errors);
  });
}


/**
 * Get back documents from Elasticsearch based on a provided field name
 * Pass documents through the classifier
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  const //split = argv.from.split('.'),
    //feature = module[argv.fe],
    //index = split[0],
    //field = argv.f,
    pageSize = '200',
    //type = split[1],
    es_stream = new ElasticsearchScrollStream(prdClient, {
      index: 'pages',
      type: '_doc',
      scroll: '5s',
      size: pageSize,
      body: {
        "query": {
          "bool" : {
            "filter": [
              {"prefix": { "uri" : "www.thecut.com" }},
              {"term": {"published": true}},
              {"exists" : { "field" : "authors" }}
            ],
            "must" : [{
              "range" : {
                  "firstPublishTime" : {
                      "gte" : "26/06/2018",
                      "lte" :  "30/06/2018",
                      "format": "dd/MM/yyyy||yyyy"
                  }
              }
            }]
          }
        },  "sort": [
        { "firstPublishTime": "asc" }
      ]
      }
    }, ['_id']);


  _(es_stream)
    .through(JSONStream.parse())
    .flatMap(function (item) {
      var id = item['uri'],
        url = id.replace('www.thecut.com', 'http://172.24.17.157'),
        originalPubDate = item['firstPublishTime'];


      return _(resolveRef(url))
      //return _(request({url: `${url}.json`, json:true, timeout: 40000,headers: {Host: 'www.thecut.com','X-forwarded-host': 'www.thecut.com'}}))
        .through(JSONStream.parse())
        .each(function (entry) {
          let pageData = {},
            articleFields = ['date', 'canonicalUrl', 'primaryHeadline', 'seoHeadline', 'featureTypes', 'tags', 'contentChannel', 'authors', 'rubric'],
            headFields = ['twitterTitle', 'ogTitle', 'syndicatedUrl', 'canonicalUrl'],
            getHeaderData = _pick(_get(entry, 'head[0]', {}), articleFields),
            headLayoutFields = ['siteName', 'pageType', 'vertical'],
            getMainArticleData = _pick(_get(entry, 'main[0]', {}), articleFields),
            getMainArticleUri = _get(entry, 'main[0]._ref'),
            getVideoArticleUri = _get(entry, 'splashHeader[0]._ref'),
            getSplashHeaderData = _pick(_get(entry, 'splashHeader[0]', {}), articleFields), // Video articles store article data in the splashHeader
            getHeadLayoutData = _get(entry, 'headLayout', {}),
            getHeadData = _get(entry, 'head', {}),
            resolvedArticleContent,
            resolvedArticleContentValues,
            articleVideoLayoutRefs,
            resolvedSingleRelatedStory,
            resolvedRelatedStory,
            resolvedArticleContentImages,
            resolvedArticleLayoutRefs,
            resolvedVideoLayoutRefs,
            resolvedArticleProductRefs,
            resolvedArticleProductBuyUrls,
            resolvedArticleVideoRefs,
            resolvedArticleOoyalaRefs,
            totalWordsInArticleContent,
            headData,
            headLayoutData;

          headData = _compact(_map(getHeadData, item => _pick(item, headFields)));
          headLayoutData = _compact(_map(getHeadLayoutData, item => _pick(item, headLayoutFields)));

          // Assign headData, headLayoutData, splashHeaderData, and mainData to the pageData obj
          Object.assign(pageData, getSplashHeaderData, getMainArticleData, getHeaderData);


          // Calculate total # of words in article content and page-level fields

          if (pageData.authors) {
            pageData.authors = resolveObj(pageData.authors) || [];
          }

          if (pageData.tags) {
            pageData.tags = resolveObj(pageData.tags.items) || [];
          }

          pageData.seoHeadline = pageData.seoHeadline || '';
          pageData.rubric = pageData.rubric || '';
          pageData.canonicalUrl = pageData.canonicalUrl || '';
          pageData.contentChannel = pageData.contentChannel || '';
          pageData.primaryHeadline = stripTags(pageData.primaryHeadline) || '';
          pageData.mostRecentPublishDate = pageData.date || '';
          pageData.originalPublishDate = originalPubDate || '';
          pageData.pageUri = `${id}@published` || '';
          pageData.featureTypes = _keys(_pickBy(pageData.featureTypes)) || [];


          // primaryHeadline
          // seoHeadline
          // featureTypes
          // tags
          // contentChannel
          // authors
          // rubric
          // pageUri
          // originalPublishDate
          // mostRecentPublishDate
          // canonicalUrl

          pageData = _omit(pageData, ['date']);

          console.log('what is pageData here', pageData);

          return bigQuery.insert('clay', 'thecut_data_2018', pageData);

        });
    })
    .each(function (item) {
      console.log('DONE!', item);
    });
}

module.exports.get = get;
