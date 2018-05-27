'use strict';

const BigQuery = require('@google-cloud/bigquery'),
  _find = require('lodash/find'),
  log = require('../log.js')({ file: __filename });


/**
 * Create BigQuery dataset
 * @param {string} datasetName
 * @param {object} bigquery
 * @returns {Promise}
 */
function createDataset(datasetName, bigquery) {
  return bigquery.createDataset(datasetName)
    .then((results) => {
      const dataset = results[0];

      log('info', `BigQuery dataset ${dataset.id} created.`);
      return dataset;;
    });
}

/**
 * Create BigQuery table
 * @param {string} dataset
 * @param {string} tableId
 * @param {[]} options, i.e. json schema to pass to BigQuery
 * @returns {Promise}
 */
function createTable(dataset, tableId, options) {
  return dataset.createTable(tableId, options)
    .then((results) => {
      const table = results[0];

      log('info', `BigQuery table ${table.id} created.`);
      return table;
    });
}

/**
 * Create a BigQuery dataset if it doesn't exist
 * @param {string} datasetName
 * @param {object} bigquery
 * @returns {Promise}
 */
function createDatasetifDoesntExist(datasetName, bigquery) {
  return bigquery.getDatasets()
    .then((data) => {
      const datasets = data[0],
        matchDataset = _find(datasets, {id: datasetName}),
        result = matchDataset ? matchDataset : createDataset(datasetName, bigquery);

      return result;
    });
}

/**
 * Create BigQuery table if it doesn't exist
 * @param {string} dataset
 * @param {string} tableId
 * @param {[]} options, i.e. json schema to pass to BigQuery
 * @returns {Promise}
 */
function createTableIfDoesntExist(dataset, tableId, options) {
  return dataset.getTables()
    .then((data) => {
      const tables = data[0],
        matchTable = _find(tables, {id: tableId}),
        result = matchTable ? matchTable : createTable(dataset, tableId, options);

      return result;
    });
}


/**
 * Insert data as a stream to BigQuery
 * @param {object} data
 * @returns {Promise}
 */
function insert(rows) {
  //console.log('what are rows', rows);
  //console.log('what is data', data);
  const bigquery = BigQuery(),
    dataset = bigquery.dataset('clay_products'),
    table = dataset.table('selectall_2017');
    
  return table.insert(rows)
    .then(function(data) {
      //console.log('what is data here', data)
      var apiResponse = data[0];
    })
    .catch(function(err) {
      console.log('err', err)
      // An API error or partial failure occurred.

      if (err.name === 'PartialFailureError') {
        // Some rows failed to insert, while others may have succeeded.

        // err.errors (object[]):
        // err.errors[].row (original row object passed to `insert`)
        // err.errors[].errors[].reason
        // err.errors[].errors[].message
      }
    });

}

module.exports.insert = insert;
