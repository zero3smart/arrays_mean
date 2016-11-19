var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');
var auth = jwt({
    secret: 'MY_SECRET',
    userProperty: 'payload'
});

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var ctrlAuth = require('../controllers/api/authentication');
var ctrlAccount = require('../controllers/api/account');
var ctrlDatasetList = require('../controllers/api/dataset/list');
var ctrlDatasetViews = require('../controllers/api/dataset/views');
var ctrlDatasetUpload = require('../controllers/api/dataset/upload');
var ctrlDatasetData = require('../controllers/api/dataset/data');
var ctrlWebsite = require('../controllers/api/website');
var ctrlUsers = require('../controllers/api/users');
var ctrlTeam = require('../controllers/api/team');

// authentication
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);
router.post('/isLoggedIn', ctrlAuth.isLoggedIn);

// account settings
router.post('/account/update', /* ensureLoggedIn,*/ctrlAccount.updateAccount);

// dataset settings
router.get('/dataset/getAll', /*ensureLoggedIn,*/ctrlDatasetList.getAll);
router.post('/dataset/remove', /*ensureLoggedIn,*/ctrlDatasetList.remove);
router.get('/dataset/get/:id', /*ensureLoggedIn,*/ctrlDatasetList.get);

// website settings

// manage users


router.get('/user/search',ctrlUsers.search);
router.post('/user',ctrlUsers.create);
router.get('/user/:id',ctrlUsers.get);


//teams
router.post('/team',ctrlTeam.create);
router.get('/team/search',ctrlTeam.search);



module.exports = router;