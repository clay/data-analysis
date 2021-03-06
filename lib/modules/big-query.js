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
function insert(data) {
  const bigquery = BigQuery(),
    ops = data.ops[0],
    dataset = data.config.dataset,
    table = data.config.table,
    schema = data.config[0].schema;

  return createDatasetifDoesntExist(dataset, bigquery)
    .then((results) => {
      return createTableIfDoesntExist(results, table, schema);
    })
    .then((table) => {
      return table.insert(ops);
    })
    .catch((err) => {
      // An API error or partial failure occurred.
      if (err.name === 'PartialFailureError') {
        log('warn', `Partial Failure occured: ${err.errors[0]}`);
      }
    });

}

module.exports.insert = insert;
