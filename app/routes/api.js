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
var ctrlTeam = require('../controllers/api/team');
var ctrlView = require('../controllers/api/views');

// authentication
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);
router.post('/isLoggedIn', ctrlAuth.isLoggedIn);

// account settings
router.post('/account/update',  ensureLoggedIn,ctrlAccount.updateAccount);

// dataset settings
router.get('/dataset/getAll',ensureLoggedIn,ctrlDataset.getAll);
router.post('/dataset/remove', ensureLoggedIn   ,ctrlDataset.remove);
router.get('/dataset/get/:id', ensureLoggedIn,ctrlDataset.get);
router.get('/dataset/getSources/:id', ensureLoggedIn,ctrlDataset.getSourcesWithSchemaID)
router.post('/dataset/update', ensureLoggedIn,ctrlDataset.update);

// dataset upload
router.post('/dataset/upload', ensureLoggedIn,upload.array('file', 12), ctrlDataset.upload);
router.get('/dataset/download/:id', ensureLoggedIn,ctrlDataset.download);

// dataset format data
router.get('/dataset/getAvailableTypeCoercions', ensureLoggedIn,ctrlDataset.getAvailableTypeCoercions);
router.get('/dataset/getAvailableDesignatedFields', ensureLoggedIn,ctrlDataset.getAvailableDesignatedFields);

// dataset import
router.post('/dataset/initializeToImport', ensureLoggedIn,ctrlDataset.initializeToImport);
router.post('/dataset/preImport', ensureLoggedIn,ctrlDataset.preImport);
router.post('/dataset/postImport', ensureLoggedIn,ctrlDataset.postImport);

// website settings

// manage users


router.get('/user/search',ctrlUsers.search);
router.post('/user',ctrlUsers.create);
router.get('/user/:id',ctrlUsers.get);
router.put('/user/:id',ctrlUsers.update);
router.get('/user/:id/resend',ctrlUsers.resend);

//views
router.get('/view', ctrlView.index);
router.get('/view/:id',ctrlView.get);



//teams
router.get('/team/search',ctrlTeam.search);





module.exports = router;