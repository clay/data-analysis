'use strict';

const elasticsearch = require('elasticsearch'),
  client = new elasticsearch.Client({
    host: 'https://vpc-clay-prd-a-t2vue7gl2x7dr7cqx7btsyb5ka.us-east-1.es.amazonaws.com:443',
    log: {
      type: 'file',
      level: 'trace',
      path: './elasticsearch.log'
    }
  }),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  h = require('highland'),
  _ = require('lodash'),
  request = require('request'),
  JSONStream = require('JSONStream'),
  bigQuery = require('./big-query'),
  yaml = require('js-yaml'),
  stripTags = require('striptags'),
  fs = require('fs'),
  pickDeep = require('lodash-pickdeep'),
  urls = require('url'),
  count = require('word-count'),
  util = require('util'),
  log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'}),
  log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

/**
 * Resolves data refs
 *
 * @param {String} url
 * @returns {Object} request
 */
function resolveRef(url) {
  return request
    .get({url: `http://${url}.json`,
    headers: {
      Host: 'nymag.com',
      'X-forwarded-host': 'nymag.com'
    },
    json:true})
    .on('error', function(err) {
      console.log('this is resolve ref err');
      console.log(err);
      console.log('this is the url that err');
      console.log(url);
    })
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
    relatedStory = _.pick(entry, ['plaintextTitle', 'title', 'content']);

    relatedStory.content = _.map(relatedStory.content, obj => _.pick(obj, '_ref'));

    return ref ? _.pick(entry, ['text', '_version']) : relatedStory;
  }
  
  return entry;
}


/**
 * Get all of the name properties from a BigQuery schema template
 *
 * @param  {Object} config
 * @returns {Array}
 */
function getSchemaFields(config) {
  return _.map(_.get(config, 'schema.fields'), 'name');
}


/**
 * For components with description fields, resolve properties
 *
 * @param {Object} entry Object with resolved data
 * @param {String} comp Component
 * @returns {Object}
 */
function checkRefDesc(entry, comp) {

  if (entry && entry._ref) {
  var ref = entry._ref.indexOf(`components/${comp}`) !== -1;

    return ref ? _pick(entry, ['text', '_version']) : entry;
  }
  
  return entry;
}

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

/**
 * Resolve a specified object property within article content, e.g. [{ref:uri}{ref:uri}] becomes [uri, uri]
 * @param {[{}]} items
 * @returns {Array}
 */
function resolveObjProperty(items, property) {
  return items.reduce((arr, item) => arr.concat(item[property]), []);
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
function insertTest(index, type, id, doc) {
  return client.bulk({
    body: [
      { index:  { _index: index, _type: type, _id: id  } },
      doc,
    ]
  }, function (err, resp) {
    console.log('what is the error here', err);
    console.log('resp', resp.errors);
  });
}

function resolveContentValues(items) {
  return items.reduce((arr, item) => {
      if (item._ref) {
        item = item._ref;
      }
      return arr.concat(JSON.stringify(item));
    }, []);
}


function getHeader(header) {
  if(header[0] && header[0].contentVideo) {
    return _.get(header[0].contentVideo, '_ref');
  }
  return header;
}

function transform(op) {
  op.articleUri = articleId;
  op.featureTypes = _.keys(_.pickBy(op.featureTypes));
  op.domain = urls.parse(`http://${op.articleUri}`).host;
  op.cmsSource = 'Clay';
  op.contentChannel = op.contentChannel || 'Other';
  op.pageUri = id;
  op.authors = op.authors ? resolveObj(op.authors) : [];
  op.tags = op.tags ? resolveObj(op.tags.items) : [];
  op.productIds = resolvedArticleProductRefs;
  op.productIdsCount = resolvedArticleProductRefs.length;
  op.videoIds = resolvedArticleVideoRefs;
  op.ooyalaIds = resolvedArticleOoyalaRefs;
  op.videoIdsCount = resolvedArticleVideoRefs.length;
  op.ooyalaIdsCount = resolvedArticleOoyalaRefs.length;
  op.productBuyUrls = resolvedArticleProductBuyUrls;
  op.imageIds = resolvedArticleContentImages;
  op.imageIdsCount = resolvedArticleContentImages.length;
  op.singleRelatedStoryIds = resolvedSingleRelatedStory;
  op.singleRelatedStoryIdsCount = resolvedSingleRelatedStory.length;
  op.relatedStoryIds = resolvedRelatedStory;
  op.relatedStoryIdsCount = resolvedRelatedStory.length;
  op.wordCount = totalWordsInArticleContent.reduce(function(sum, val) { return sum + val; }, 0);
  op.timestamp = new Date();

  return op;
}    


/**
 * Get back documents from Elasticsearch based on a provided field name
 * Pass documents through the classifier
 *
 * @param {Object} module
 * @param {String} argv Arguments provided
 */
function get(module, argv) {
  const split = argv.from.split('.'),
    schema = yaml.safeLoad(fs.readFileSync(argv.sc, 'utf8')),
    schemaProps = getSchemaFields(schema),
    feature = module[argv.fe],
    index = split[0],
    field = argv.f,
    pageSize = '200',
    type = split[1],
    es_stream = new ElasticsearchScrollStream(client, {
      index: index,
      type: type,
      scroll: '5s',
      size: pageSize,
      body: {      
        query: {
          bool : {
            filter: {
              prefix: {_id: "nymag.com/strategist/_components/article/instances/cjc2dif2i00b47ty6cpyy0bqf@published"}
            }/*,
            must: {
                match: {
                  "featureTypes.Video-Original": true
                }
            }*/
/*            must : {
              range : {
                  date : {
                      gte : "2012",
                      lte: "2018"
                  }
              }
            }*/
          }
        }       
      }
    }, ['_id']);

  h(es_stream)
    .through(JSONStream.parse())
    .ratelimit(1, 1000)
    .flatMap(function (item) {
      console.log("what is pageUri");
      console.log(item.pageUri);
      var id = item.pageUri,
        articleId = item['_id'],
        url = id.replace('nymag.com', '172.24.17.157');

      return h(resolveRef(url))
        .through(JSONStream.parse())  
        .map(function(item) {
         
          let main = item.main ? pickDeep(item.main[0], schemaProps) : {},
            video = item.splashHeader && item.splashHeader.length > 0 ? pickDeep(item.splashHeader[0], schemaProps): {},
            head = item.head ? pickDeep(item.head[0], schemaProps) : {},
            headLayout = item.headLayout ? pickDeep(item.headLayout[0], schemaProps): {},
            resolvedArticleContent = item.main ? _.map(resolveObj(_.compact(item.main[0].content)), item => stripTags(item)) : {},
            resolvedArticleLayoutRefs = item.main ? _.compact(resolveObjProperty(_.compact(item.main[0].content), '_ref')) : {},
            resolvedVideoLayoutRefs = item.splashHeader && item.splashHeader.length > 0 ? getHeader(item.splashHeader) : {},
            articleVideoLayoutRefs = [].concat([resolvedVideoLayoutRefs], resolvedArticleLayoutRefs),
            // Object.values doesn't have full browser support yet. Womp.
            resolvedArticleContentValues = item.main ? _.compact(_.flattenDeep(_.map(item.main[0].content, item => Object.keys(item).map(key => item[key])))) : [],
            resolvedVideoContentValues = item.splashHeader && item.splashHeader.length > 0 ? _.compact(_.flattenDeep(_.map(item.splashHeader[0].relatedInfo, item => item.text))) : [],

            totalWordsInArticleContent = _.map(_.compact([resolvedArticleContent.toString(), resolvedVideoContentValues.toString(), head.ogTitle, main.primaryHeadline, main.shortHeadline, video.primaryHeadline, video.shortHeadline]), item => count(item)),

            // TODO: Can probably consolidate all of these filtered vars
            resolvedArticleContentImages = item.main ? _.filter(resolveContentValues(resolvedArticleContentValues), item => item.indexOf('pixel.nymag.com') !== -1) : [],
            resolvedArticleProductRefs = item.main ? _.filter(_.compact(resolvedArticleLayoutRefs), item => item.indexOf('components/product') !== -1) : [],
            resolvedArticleVideoRefs = item.main  > 0 ? _.filter(_.compact(articleVideoLayoutRefs), item => item.indexOf('components/video') !== -1): [],
            resolvedArticleOoyalaRefs = item.splashHeader && item.splashHeader.length > 0 ? _.filter(_.compact(articleVideoLayoutRefs), item => item.indexOf('components/ooyala') !== -1) : [],
            resolvedSingleRelatedStory = item.main ? _.filter(resolveContentValues(resolvedArticleContentValues), item => item.indexOf('components/single-related-story') !== -1) : [],
            resolvedRelatedStory = item.main ? _.filter(resolveContentValues(resolvedArticleContentValues), item => item.indexOf('components/related-story') !== -1) : [],
            resolvedArticleProductBuyUrls = item.main ? _.compact(resolveObjProperty(_.compact(item.main[0].content), 'buyUrlHistory')) : [],

            // Calculate total # of words in article content and page-level fields


            data = {};


            data.ops = [Object.assign(main, head, headLayout, video)];
            data.config = { schema };

    



            _.map(data.ops, function(op) {
                op.articleUri = articleId;
                op.featureTypes = _.keys(_.pickBy(op.featureTypes));
                op.domain = urls.parse(`http://${op.articleUri}`).host;
                op.cmsSource = 'Clay';
                op.contentChannel = op.contentChannel || 'Other';
                op.pageUri = id;
                op.authors = op.authors ? resolveObj(op.authors) : [];
                op.tags = op.tags ? resolveObj(op.tags.items) : [];
                op.productIds = resolvedArticleProductRefs;
                op.productIdsCount = resolvedArticleProductRefs.length;
                op.videoIds = resolvedArticleVideoRefs;
                op.ooyalaIds = resolvedArticleOoyalaRefs;
                op.videoIdsCount = resolvedArticleVideoRefs.length;
                op.ooyalaIdsCount = resolvedArticleOoyalaRefs.length;
                op.productBuyUrls = resolvedArticleProductBuyUrls;
                op.imageIds = resolvedArticleContentImages;
                op.imageIdsCount = resolvedArticleContentImages.length;
                op.singleRelatedStoryIds = resolvedSingleRelatedStory;
                op.singleRelatedStoryIdsCount = resolvedSingleRelatedStory.length;
                op.relatedStoryIds = resolvedRelatedStory;
                op.relatedStoryIdsCount = resolvedRelatedStory.length;
                op.wordCount = totalWordsInArticleContent.reduce(function(sum, val) { return sum + val; }, 0);
                op.timestamp = new Date();
              console.log('what is insert data');
              console.log(op);
              return op;
          })     
          return bigQuery.insert(data, argv); 

        })

    })  
    .each(done => console.log('Done!', done))
}




module.exports.get = get;

