var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');
var auth = jwt({
    secret: process.env.SESSION_SECRET,
    userProperty: 'payload'
});

var path = require('path');
var multer  = require('multer');
var upload = multer({ dest: path.join(__dirname, '../../tmp') });


var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var ctrlAuth = require('../controllers/api/authentication');
var ctrlAccount = require('../controllers/api/account');
var ctrlDataset = require('../controllers/api/dataset');
var ctrlUsers = require('../controllers/api/users');

// authentication
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);
router.post('/isLoggedIn', ctrlAuth.isLoggedIn);

// account settings
router.post('/account/update', /* ensureLoggedIn,*/ctrlAccount.updateAccount);

// dataset settings
router.get('/dataset/getAll', /*ensureLoggedIn,*/ctrlDataset.getAll);
router.post('/dataset/remove', /*ensureLoggedIn,*/ctrlDataset.remove);
router.get('/dataset/get/:id', /*ensureLoggedIn,*/ctrlDataset.get);
router.post('/dataset/update', /*ensureLoggedIn,*/ctrlDataset.update);
// dataset upload
router.post('/dataset/upload', /*ensureLoggedIn,*/upload.array('file', 12), ctrlDataset.upload);

// website settings

// manage users

router.post('/user/search',ctrlUsers.search);
router.post('/user',ctrlUsers.create);
router.get('/user/:id',ctrlUsers.get);


module.exports = router;