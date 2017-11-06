'use strict';

const BigQuery = require('@google-cloud/bigquery'),
  projectId = process.env.BQ_PROJECT_ID,
  bigquery = BigQuery({
    projectId: projectId,
    keyFilename: './keyfile.json'
  });

function get(module, query, argv) {
  const feature = module[argv.fe],
    options = {
		  query: query,
		  useLegacySql: false
    },
    field = argv.f; // TODO: Allow multiple comma-separated fields

  let job;

  // Run the query as a job
  bigquery
	  .startQuery(options)
	  .then((results) => {
	    job = results[0];
	    console.log(`Job ${job.id} started.`);
	    return job.promise();
	  })
	  .then(() => {
	    // Get the job's status
	    return job.getMetadata();
	  })
	  .then((metadata) => {
	    // Check the job's status for errors
	    const errors = metadata[0].status.errors;

	    if (errors && errors.length > 0) {
	      throw errors;
	    }
	  })
	  .then(() => {
	    console.log(`Job ${job.id} completed.`);
	    return job.getQueryResults();
	  })
	  .then((results) => {
	    const rows = results[0];

	    console.log('Rows:');
	    rows.forEach((row) => {
        return feature.analyze(module, row[field], argv);
	    });
	  })
	  .catch((err) => {
	    console.error('ERROR:', err);
	  });
}

function insert(argv, rows) {
  const split = argv.to.split('.'),
    datasetId = split[0],
    tableId = split[1];

  bigquery
    .dataset(datasetId)
    .table(tableId)
    .insert(rows)
    .then((insertErrors) => {
      console.log('Inserted:', rows);
      rows.forEach((row) => console.log(row));

      if (insertErrors && insertErrors.length > 0) {
        console.log('Insert errors:');
        insertErrors.forEach((err) => console.error(err));
      }
    })
    .catch((err) => {
    // An API error or partial failure occurred.
      if (err.name === 'PartialFailureError') {
        console.log('Errors:', err.errors[0]);
      }
    });
}

module.exports.get = get;
module.exports.insert = insert;
