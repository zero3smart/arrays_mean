# Arrays

## Server & Front-end Code Repository

### Basic repository contents:

1. Front-end web server application at [`local_modules/app`](local_modules/app), including front-end publicly hosted assets at [`local_modules/app/public`](local_modules/app/public)

2. Database seeding and post-import caching for MVP via CSV import at [`local_modules/data_ingestion`](local_modules/data_ingestion)


---------------------

### Getting Started

#### i. Setting up your local development environment

1. Install brew

	* [Homebrew](http://brew.sh)

2. Install Node.JS & NPM: 
	* [Install Node.js and npm using Homebrew on OS X](https://changelog.com/install-node-js-with-homebrew-on-os-x/), 
	* [How to Install Node.js and NPM on a Mac](http://blog.teamtreehouse.com/install-node-js-npm-mac)

3. Install nodemon for development (optional)
    * Execute `npm install -g nodemon`

4. Install MongoDB: 
	* [Install MongoDB Community Edition on OS X](https://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/)
	
    Note: If you already have Mongo installed, be sure you have >= v3.2 with `brew update && brew upgrade mongodb`
    
5. Run the MongoDB daemon by executing `monogod` in a Terminal window

#### ii. Installing the Arrays server locally

##### I. Download repo

1. First, clone this repository to your computer with `git clone git@github.com:schemadesign/arrays.git`

##### II. Getting onto the 'develop' branch

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `git checkout develop`

##### III. Installing `node_modules` in the 'develop' package.json

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `npm install`

##### IV. Building the front-end CSS files

###### 1. Install `bower_components` in the 'develop' bower.json

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `bower install`

###### 2. Run the Grunt tasks

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `grunt build` to rebuild the main CSS file, style.min.css
3. Execute `grunt watch` to start LiveReload which will rebuild the css and reload the page whenever a CSS, HTML, or JS file is saved

##### V. Creating your `.env.development` and `.env.production` files

Environment-related secrets such as the production password database are not committed to this repository as a security-related best practice.

In order to add them (and to support both local development and production deployment) you need to create two files named ".env.development" and ".env.production" in the root directory of this repository at `arrays-server-js/.env*` and then fill them respectively with the content of the following Google Docs:

* [Arrays - Server - .env.production](https://docs.google.com/document/d/1d1IoAHgGPB4bwWGaYprtBFSVoLEcoEuw4WdruUt-v9k/)
* [Arrays - Server - .env.development](https://docs.google.com/document/d/15-SkjQHqznSMOWevEH6yZvshdNqMzN4RErMhOPFz3jc/)

#### iii. Signing into Google Cloud Platform

1. Download the archive file and extract: https://cloud.google.com/sdk/docs/quickstart-mac-os-x
2. Run `./google-cloud-sdk/install.sh` from the containing folder.
3. Run `gcloud init`


#### iv. Seeding the local database

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Configure datasets to batch import in [`data_ingestion/datasource_descriptions/default.js`](local_modules/data_ingestion/datasource_descriptions/default.js)
3. Execute [`bin/_dev_MVP_DB_seed`](bin/_dev_MVP_DB_seed) to import all datasets configured in `default.js`
4. Execute [`bin/__dev_postImportCaching`](bin/__dev_postImportCaching) -- Needed for generating the sidebar filters cache

##### Importing one dataset at a time
1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute [`bin/_dev_MVP_DB_seed marvel_character_database`](bin/_dev_MVP_DB_seed) where `marvel_character_database` is the file name to import from the `data_ingestion/datasource_description/` directory. `marvel_character_database.js` is also acceptable.
3. These parameters can be applied to all the binary commands in the `/bin` directory
  * bin/_start_dev_postImportCaching
  * bin/__dev_postImportCaching
  * bin/__DEVELOPMENT__MVP_DB_seed__enterImageScrapingDirectly
  * bin/__dev_MVP_DB_seed__enterImageScrapingDirectly
  * Etc.
4. Except for:
  * _runUntilSuccess_DEVELOPMENT__MVP_DB_seed__enterImageScrapingDirectly
  * _runUntilSuccess_PRODUCTION__MVP_DB_seed__enterImageScrapingDirectly 
  * Start_dev_app
  * _start_dev_MoMA_canned_questions
  * _prod_MoMA_canned_questions
5. Execute [`bin/__dev_postImportCaching`](bin/__dev_postImportCaching) to re-generate sidebar filters cache

#### v. Running the front-end web server locally

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute [`bin/start_dev_app`](bin/start_dev_app)


---------------------

### Customizing the database-seeding import

See this Doc for information on the data import framework capabilities.

[Arrays Server - Data Source Import documentation](https://docs.google.com/document/d/1v4L14gCiEI1_z5sqOVC2RFNZVgtGC--pvEf8yN9y-rU/edit#heading=h.qi2u6fyf9xdo)


---------------------

### Contributing
1. Contributors should check out the 'develop' branch with `git checkout develop` and push only non-breaking changes to this branch. 

2. Commits that might include breaking changes, i.e. API modifications, large refactors, cross-module works-in–progress, etc., should go on a separate branch. To create a new branch, execute `git checkout -b [your branch name]`. 

3. When you're ready to merge your branch back into 'develop':

	3a. `git pull` to get the latest changes to 'develop' from origin,

	3b. checkout your branch, 
	
	3c. execute `git rebase -i develop`, 
	
	3d. resolve any conflicts during the interactive rebase, 
	
	3e. checkout 'develop',
	
	3f. finally, execute `git merge [your branch name]`. 

	If everything went well it's also a good idea to prune your old branches, especially if you have pushed them up to origin (github). (Note: This same interactive-rebase-and-merge procedure is applied when merging 'develop' into 'master' for a release. The rebase is included in case hotfixes are added to 
	'master' which need to be backwards-integrated into 'develop' - which should be avoided whenever possible.) 

4. Production releases should generally be tagged on 'master', and this should probably be automated later by using a continuous integration system.


---------------------

### Deploying to production 

#### Deploying HEAD to Google Cloud Platform/App Engine

1. Execute [`bin/deploy`](bin/deploy)

#### Seeding the production database

1. Execute [`bin/_PRODUCTION__MVP_DB_seed`](bin/_PRODUCTION__MVP_DB_seed)

If you find that image scraping during the MVP seed is failing after you're sure the initial pre-scraping import work has completed, you can run [`bin/_runUntilSuccess_PRODUCTION__MVP_DB_seed__enterImageScrapingDirectly`](_runUntilSuccess_PRODUCTION__MVP_DB_seed__enterImageScrapingDirectly) to continuously retry running the image scraping stage and all subsequent stages until it completes successfully.

2. Execute [`bin/_PRODUCTION_postImportCaching`](bin/_PRODUCTION_postImportCaching)

