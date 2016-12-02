var express = require('express');
var router = express.Router();

var path = require('path');
var multer  = require('multer');
var upload = multer({ dest: path.join(__dirname, '../../tmp') });

var unless = require('express-unless');
var ctrlAccount = require('../controllers/api/account');
var ctrlDataset = require('../controllers/api/dataset');
var ctrlUsers = require('../controllers/api/users');
var ctrlTeam = require('../controllers/api/team');
var ctrlView = require('../controllers/api/views');


var ejwt = require('express-jwt');



var auth = ejwt({
   secret: process.env.SESSION_SECRET,
   userProperty: 'payload'
}).unless({
	path: [  /\/api\/user/i,
			/\/api\/team/i,
			/\/api\/view/i
	]
});

router.use(auth,function(err,req,res,next) {


	if (err.name == 'UnauthorizedError') {

		console.log(err);
		res.status(401).send('unauthorized');
	} else {
		return next();
	}
});

// account settings
router.post('/account/update',ctrlAccount.updateAccount);

// dataset settings
router.get('/dataset/getAll',ctrlDataset.getAll);

router.post('/dataset/remove',ctrlDataset.remove);
router.get('/dataset/get/:id', ctrlDataset.get);
router.get('/dataset/getSources/:id',ctrlDataset.getSourcesWithSchemaID)
router.post('/dataset/update',ctrlDataset.update);
router.put('/dataset/publish/',ctrlDataset.publish);

// dataset upload
router.post('/dataset/upload',upload.array('file', 12), ctrlDataset.upload);
router.get('/dataset/download/:id',ctrlDataset.download);

// dataset format data
router.get('/dataset/getAvailableTypeCoercions', ctrlDataset.getAvailableTypeCoercions);
router.get('/dataset/getAvailableDesignatedFields', ctrlDataset.getAvailableDesignatedFields);

// dataset import
router.post('/dataset/initializeToImport',ctrlDataset.initializeToImport);
router.post('/dataset/preImport',ctrlDataset.preImport);
router.post('/dataset/postImport', ctrlDataset.postImport);

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

//datasourceMapping in format view
router.get('/dataset/getMappingDatasourceCols/:pKey',ctrlDataset.loadDatasourceColumnsForMapping);



//teams
router.get('/team/search',ctrlTeam.search);
router.get('/team/loadIcons',ctrlTeam.loadIcons);





module.exports = router;