'use strict';

const BigQuery = require('@google-cloud/bigquery'),
  _find = require('lodash/find');


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

      console.log(`Dataset ${dataset.id} created.`);
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

      console.log(`Table ${tableId} created.`);
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
  const bigquery = BigQuery();

  return createDatasetifDoesntExist(data.config.dataset, bigquery)
    .then((results) => {
      return createTableIfDoesntExist(results, data.config.table, data.config[0].schema);
    })
    .then((table) => {
      return table.insert(data.ops[0])
        .then((results) => {
          console.log(`Results are: ${results[0]}`);
        })
        .catch((err) => {
          // An API error or partial failure occurred.
          if (err.name === 'PartialFailureError') {
            console.log(`Partial Failure Error occured: ${err.errors[0]}`)
          }
        });
    });
}

module.exports.insert = insert;
