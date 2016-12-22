# Arrays

## Server & Front-end Code Repository

### Basic repository contents:

1. Front-end web server application at [`app`](app), including front-end publicly hosted assets at [`app/public`](app/public)

2. Database seeding and post-import caching via CSV import at [`app/controllers/pre_process`](app/controllers/pre_process)


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

In order to add them (and to support both local development and production deployment) you need to create two files named ".env.development" and ".env.production" in 'config/env/' of this repository at `arrays/config/env/.env*` and then fill them respectively with the content of the following Google Docs:

* [Arrays - Server - .env.production](https://docs.google.com/document/d/1d1IoAHgGPB4bwWGaYprtBFSVoLEcoEuw4WdruUt-v9k/)
* [Arrays - Server - .env.development](https://docs.google.com/document/d/15-SkjQHqznSMOWevEH6yZvshdNqMzN4RErMhOPFz3jc/)

##### VI. Changing your localhost settings on your computer and creating a local arrays account

1. Add local.arrays.co:
  * Run `sudo nano /etc/hosts` - You should see some numbers including your local ip address on the left column and host names on the right.
  * Add a new log `[your local ip address]    local.arrays.co`
  * Save the write changes with "control" + "o"
  * Hit "enter"
  * Exit with "control" + "x"

2. Navigate to local.arrays.co:9080 and create a new account.

3. Add your subdomain to hosts
  * Run `sudo nano /etc/hosts` again.
  * Add a new log `[your local ip address]    [your arrays subdomain].local.arrays.co` 
  * Save the write changes with control + "o"
  * Hit "enter"
  * Exit with "control" + "x"
Anytime you add a new account in arrays, you will have a new subdomain. If you want that subdomain to work locally, you have to add it to your hosts file.

##### VII. Adding views to the database.


1. Download [Robomongo](https://robomongo.org/download), if you don't already have it.
2. Open Robomongo, go to File -> Connection and click create
3. Address will be localhost:27017. Save and Connect.
4. Expand arraysdb and right click Collections then click create collection and name it "views".
5. Right click the views collection you just created and select Insert Document.
6. Go to Google Docs, click the folder icon -> Shared With Me -> Arrays Beta -> MongoDB Files -> JSON -> views
7. Copy each of the view files and paste into the Insert Document window. (by the end, you should have 9 objects in your views collection)

##### VIII. Running the front-end server locally

1. Flush your cache by running `dscacheutil -flushcache` in the terminal and you're all set for running Arrays locally!. 
2. Execute [`bin/start_dev_app`](bin/start_dev_app)

#### iii. Signing into Heroku

1. Download/Install the heroku toolbelt: https://devcenter.heroku.com/articles/heroku-command-line
2. Login to the heroku account.
$ heroku login
3. Add a remote using the git URL so that you can deploy the current source to Heroku.
$ heroku git:remote -a arrays

---------------------

### Customizing the database-seeding import

See this Doc for information on the data import framework capabilities.

[Arrays Server - Data Source Import documentation](https://docs.google.com/document/d/1v4L14gCiEI1_z5sqOVC2RFNZVgtGC--pvEf8yN9y-rU/edit#heading=h.qi2u6fyf9xdo)


---------------------

### Contributing Workflow
1. Contributors should check out the 'develop' branch with `git checkout develop`.

2. Anytime you work on a new feature/bug fix etc, create a new branch. From the develop branch, run `git checkout -b [a branch name]`. If you execute `git branch` you can see that you've created and navigated to your new branch.

3. When you're done working on that branch, navigate to the repo and you should see a green button above the files that says "Compare & pull request". Click that button.

    3a. Towards the top of the page, there will be a bar with two buttons. Click the one that says "base: master" and change it to "develop". Then click the "compare" button and make sure it's on your current branch.

    3b. Add in any comments for clarity and click "Create pull request".

4. Once you're ready to start a new branch, go back to step 1. Note: It's important to start the new branch off 'develop' as each time you create one, it inherits from the branch you're currently on.


---------------------

### Deploying to production 

#### Deploying HEAD to Heroku

1. Execute [git push heroku master](git push heroku develop:master)

#### Seeding the production database

1. Execute [`bin/_PRODUCTION_DB_seed`](bin/_PRODUCTION_DB_seed)

If you find that image scraping during the seed is failing after you're sure the initial pre-scraping import work has completed, you can run [`bin/_runUntilSuccess_PRODUCTION_DB_seed__enterImageScrapingDirectly`](_runUntilSuccess_PRODUCTION_DB_seed__enterImageScrapingDirectly) to continuously retry running the image scraping stage and all subsequent stages until it completes successfully.

2. Execute [`bin/_PRODUCTION_postImportCaching`](bin/_PRODUCTION_postImportCaching)