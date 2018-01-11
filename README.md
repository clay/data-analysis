Clay Data Analysis
========================

Installation
============

- git clone
- nvm install v8
- npm install
- [Authenticate](https://cloud.google.com/docs/authentication/getting-started) to Google's Cloud API from an associated Google Cloud Platform Project and download the keyfile.json.
- Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS=[PATH]`, replacing `[PATH]` with the location of the keyfile.json file you downloaded in the previous step.
- Enable both the [BigQuery API](https://cloud.google.com/bigquery/) and the [Google Natural Language API](https://cloud.google.com/natural-language)  within your created project.

Setup & Integration
===================

In your app.js, instantiate Clay Data Science by passing in the parent directory where your tasks (data science features) will live:

```
dataAnalysis.config({
  projectDir: path.resolve('./parent-directory')
});
```

To leverage `save` and `publish` hooks, ensure that Clay Data Science is also passed in as an Amphora Plugin during Amphora instantation:

```
return amphora(
  plugins: [dataAnalysis]
})
```

The parent directory should include a subdirectory called `tasks`, with each task including a [`handler`], a [`transform`], and a [`data schema`]. The directory structure should look like this:

```
- parent-directory
  - tasks
    - feature
      - handler.js
      - schema.yml
      - transform.js
```
        
Data Schema
===========

Coming soon!


Transform
===========

Coming soon!


Handler
===========

Coming soon!


CLI
====

Clay Data Science also contains a handy CLI for importing legacy data to BigQuery via Elasticsearch. To get started, just set an `ELASTICSEARCH_HOST` environment variable.   

Commands
========

- `npm lint` - runs eslint
- `./bin/cli.js`
    - `--help`
    - [`nlp`](https://github.com/clay/data-analysis#nlp)

NLP
========

Parses Elasticsearch data based on a specified NLP feature and stores the parsed data into a BigQuery dataset/table.

`./bin/cli.js nlp --service elasticsearch --from published-articles.general --to clay_sites.content_classification --field content --query /path/to/query.json --schema /path/to/schema.yml --feature classifyContent`

* `--service, -s <service>` : The data source
* `--feature, -fe <feature>` : An NLP feature, e.g. classifyContent
* `--to, -t <index>.<type>` : Configuration for pulling data from Elasticsearch
* `--from, -fr <dataset>.<table>` : The BigQuery dataset and table to insert data into
* `--field -f <field>` : The data to analyze, based on property/field name
* `--query -q <query>` : The file path to a query to POST to [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html)
* `--schema -sc <schema>` : The file path to a yml schema to pass to BigQuery [BigQuery Schemas](https://cloud.google.com/bigquery/docs/schemas)

Coming Soon
===========
- Tests
- More NLP features!
- More thorough documentation on schemas within tasks
