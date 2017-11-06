Clay Data Science CLI
========================

A CLI for performing data analysis on Clay data

Installation
============

- git clone
- nvm install v8
- npm install
- Create a `keyfile.json` with BigQuery account keys from [Google Cloud Platform](https://console.cloud.google.com/apis/credentials?project=nymag-analaytics-dev).
- Set an environment variable for the BigQuery project id, e.g. `process.env.BQ_PROJECT_ID`

Commands
========

- `npm lint` - runs eslint
- `./bin/cli.js`
    - `--help`
    - [`nlp`](https://github.com/nymag/clay-data-science#nlp)
    
Nlp
====

Parses data based on a specified NLP feature and stores the parsed data into a BigQuery table.

`./bin/cli.js nlp --feature sentimentAnalysis --from <dataset>.<table> --to <dataset>.<table> --field paragraphDescription --limit 20`

* `--feature, -fe <feature> : An NLP feature, e.g. sentimentAnalysis, entityAnalysis, contentClassification`
* `--from, -fr <dataset>.<table> : The BigQuery dataset and table to pull data from to analyze`
* `--field -f <field> : The BigQuery field to perform the analysis on`
* `--limit -l <limit> : Specify a limit of rows to get and insert back into BigQuery`


Coming Soon
===========

- Elasticsearch integration
- Schema.json files for generating datasets/tables 
- More modules!
