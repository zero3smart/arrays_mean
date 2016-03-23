# Arrays
## Server & Front-end Code Repository

### Repository Contents:

1. Front-end web server application at `local_modules/app`, including front-end publicly hosted assets at `local_modules/app/public`.

2. Database seeding for MVP via CSV import at `local_modules/data_ingestion`.

3. Raw import MongoDB modeling at `local_modules/raw_objects` 



### Getting Started

#### Setting up your local development environment

1. Install brew
2. Install Node.JS & NPM
3. Install MongoDB
4. Run the MongoDB daemon by executing `monogod`

#### Installing the Arrays server locally

##### I. Download repo

1. First, clone this repository to your computer with `git clone git@github.com:schemadesign/arrays.git`

##### II. Getting onto the 'develop' branch

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `git checkout develop`

##### III. Installing `node_modules` in package.json

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `npm install`


###### IV. (Not necessary as of this edit) Installing git submodules

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `git submodule init` and then `git submodule update`.
3. (Optional) Recursively checkout 'develop' on nested submodules.



#### Running the front-end web server locally

1. Change directory (`cd [the path to]/arrays`) into your local clone of this repository
2. Execute `bin/start_dev_app`


### Contributing
1. Contributors should check out the 'develop' branch with `git checkout develop` and push only non-breaking changes to this branch. 

2. Commits that might include breaking changes, i.e. API modifications, large refactors, works in progress, etc., should go on a separate branch. To create a new branch, execute `git checkout -b [your branch name]`. 

3. When you're ready to merge your branch back into 'develop':

	3a. checkout your branch, 
	
	3b. execute `git rebase -i develop`, 
	
	3c. resolve any conflicts during the interactive rebase, 
	
	3d. checkout 'develop',
	
	3e. finally, execute `git merge [your branch name]`. 

	If everything went well it's also a good idea to prune your old branches, especially if you have pushed them up to origin (github). (Note: This same interactive-rebase-and-merge procedure is applied when merging 'develop' into 'master' for a release.) 

4. Production releases should generally be tagged on 'master', and this should probably be automated later by using a continuous integration system.

### Deploying to production 

#### Deploying HEAD to Google Cloud Platform/App Engine

1. Execute `bin/deploy`

#### Seeding the production database

1. Execute `bin/_PRODUCTION__MVP_DB_seed`
