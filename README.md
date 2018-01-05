Clay Data Science
========================

Installation
============

- git clone
- nvm install v8
- npm install
- [Authenticate](https://cloud.google.com/docs/authentication/getting-started) to Google's Cloud API from an associated Google Cloud Platform Project and download the keyfile.json.
- Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS=[PATH]`, replacing [PATH] with the location of the keyfile.json file you downloaded in the previous step.
- Enable both the [BigQuery API](https://cloud.google.com/bigquery/) and the [Google Natural Language API](https://cloud.google.com/natural-language)  within your created project.

Integration
============



Commands
========

- `npm lint` - runs eslint
- `./bin/cli.js`
    - `--help`
    - [`nlp`](https://github.com/nymag/clay-data-science#nlp)

Clay Data Science also contains a handy CLI for importing legacy data to BigQuery via Elasticsearch:    

Nlp
====

Parses Elasticsearch data based on a specified NLP feature and stores the parsed data into a BigQuery dataset/table.

`./bin/cli.js nlp --service elasticsearch --from published-articles.general --to clay_sites.content_classification --field content --query /Users/dalia/Desktop/query.json --schema /Users/dalia/Desktop/categories.yml --feature classifyContent`

* `--service, -s <service> : The data source`
* `--feature, -fe <feature> : An NLP feature, e.g. classifyContent`
* `--to, -t <index>.<type> : Configuration for pulling data from Elasticsearch'
`
* `--from, -fr <dataset>.<table> : The BigQuery dataset and table to insert data into`

* `--field -f <field> : The data to analyze, based on property/field name`
* `--query -q <query> : The query to POST to Elasticsearch. [Query Examples](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html)`
* `--schema -sc <schema> : The yml [schema](https://cloud.google.com/bigquery/docs/schemas) to pass to BigQuery`

Coming Soon
===========

- Tests
- More NLP features!
