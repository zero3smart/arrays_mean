var express = require('express');
var router = express.Router();

var path = require('path');
var multer = require('multer');
var upload = multer({dest: path.join(__dirname, '../../tmp')});

var unless = require('express-unless');
var ctrlAdmin = require('../controllers/api/admin');
var ctrlDataset = require('../controllers/api/dataset/index');
var ctrlConnection = require('../controllers/api/dataset/remote');
var ctrlUsers = require('../controllers/api/users');
var ctrlTeam = require('../controllers/api/team');
var ctrlView = require('../controllers/api/views');
var ctrlBillingAccount = require('../controllers/api/billing/account');
var ctrlBillingInfo = require('../controllers/api/billing/billingInfo');
var ctrlPlans = require('../controllers/api/billing/plans');
var ctrlSubscriptions = require('../controllers/api/billing/subscriptions');
var ejwt = require('express-jwt');

var auth = ejwt({
    secret: process.env.SESSION_SECRET
}).unless({
    path: [/\/api\/user/i,
        /\/api\/team/i,
        /\/api\/view/i
    ]
});





router.use('/',auth, function (err, req, res, next) {
    console.log(err);
    if (err.name == 'UnauthorizedError') {
        res.status(401).send('unauthorized');
    } else {
        return next();
    }
});


//admin functions
router.post('/admin/invite', ctrlAdmin.invite);

// dataset settings
router.get('/dataset', ctrlDataset.search);

router.post('/dataset/getDatasetsWithQuery',ctrlDataset.getDatasetsWithQuery);
router.post('/dataset/remove', ctrlDataset.remove);
router.get('/dataset/get/:id', ctrlDataset.get);
router.get('/dataset/getAdditionalSources/:id', ctrlDataset.getAdditionalSourcesWithSchemaID);
router.post('/dataset/save', ctrlDataset.save);
router.put('/dataset/update/:id',ctrlDataset.update);
router.put('/dataset/approve/:id',ctrlDataset.approvalRequest);


router.post('/dataset/removeSubdataset', ctrlDataset.removeSubdataset);
router.get('/dataset/reimportDatasets/:id',ctrlDataset.getDependencyDatasetsForReimporting);
router.get('/dataset/jobStatus/:id',ctrlDataset.getJobStatus);

router.get('/dataset/getAssetUploadSignedUrl/:id', ctrlDataset.signedUrlForAssetsUpload);
router.get('/dataset/deleteBanner/:id', ctrlDataset.deleteBanner);


// dataset upload
router.post('/dataset/upload', upload.array('file', 12), ctrlDataset.upload);
router.get('/dataset/download/:id', ctrlDataset.download);


router.delete('/dataset/source/:id', ctrlDataset.deleteSource);
router.delete('/dataset/job/:id' ,ctrlDataset.killJob);

// dataset format data
router.get('/dataset/getAvailableTypeCoercions', ctrlDataset.getAvailableTypeCoercions);
router.get('/dataset/getAvailableMatchFns', ctrlDataset.getAvailableMatchFns);

// dataset import
router.get('/dataset/preImport/:id', ctrlDataset.preImport);;
router.get('/dataset/importProcessed/:id',ctrlDataset.importProcessed);
router.get('/dataset/postImport/:id', ctrlDataset.postImport);
router.get('/dataset/scrapeImages/:id', ctrlDataset.scrapeImages)

router.post('/dataset/connect/:id',ctrlConnection.connect);
router.post('/dataset/colsForJoinTables/:id',ctrlConnection.getColumnsForFieldMapping);

//manage users
router.get('/user/search', ctrlUsers.search);
router.post('/user', ctrlUsers.create);
router.get('/user/:id', ctrlUsers.get);
router.put('/user/:id', ctrlUsers.update);
router.get('/user/:id/resend', ctrlUsers.resend);
router.get('/user/:id/reset',ctrlUsers.reset);
router.put('/user/:id/updateProfile',ctrlUsers.updateProfile);
router.post('/user/:id/checkPw',ctrlUsers.checkPw);
router.post('/user/:id', ctrlUsers.save);
router.delete('/user/:id', ctrlUsers.delete);
router.get('/user/getAll/:teamId',ctrlUsers.getAll);
router.put('/user/defaultLoginTeam/:teamId',ctrlUsers.defaultLoginTeam);

//views
router.get('/view', ctrlView.getAll);
router.get('/view/:id', ctrlView.get);


//datasourceMapping in format view
router.get('/dataset/getMappingDatasourceCols/:id', ctrlDataset.loadDatasourceColumnsForMapping);

//teams, website setting info
router.post('/team', ctrlTeam.create);
router.get('/team', ctrlTeam.getAll);
router.get('/team/search', ctrlTeam.search);
router.get('/team/loadIcons', ctrlTeam.loadIcons);
router.get('/team/deleteImage/:id/:folder/:filename', ctrlTeam.deleteImage);
router.get('/team/getAssetUploadSignedUrl/:id', ctrlTeam.signedUrlForAssetsUpload);
router.put('/team/:id', ctrlTeam.update);
router.put('/team/admin/:id',ctrlTeam.switchAdmin);
router.delete('/team/:id',ctrlTeam.delete);

// billing, account & subscriptions settings
router.post('/billing/account', ctrlBillingAccount.create);
router.get('/billing/account', ctrlBillingAccount.get);
router.post('/billing/billinginfo', ctrlBillingInfo.create);
router.get('/billing/billinginfo', ctrlBillingInfo.get);
router.put('/billing/billinginfo', ctrlBillingInfo.update);
router.get('/billing/plans/:plan_code', ctrlPlans.get);
router.get('/billing/plans', ctrlPlans.getAll);
router.post('/billing/subscriptions', ctrlSubscriptions.create);
router.get('/billing/subscriptions', ctrlSubscriptions.getAll);
router.put('/billing/subscriptions/:subscrId', ctrlSubscriptions.update);
router.put('/billing/subscriptions/:subscrId/cancel', ctrlSubscriptions.cancel);
router.put('/billing/subscriptions/:subscrId/reactivate', ctrlSubscriptions.reactivate);


module.exports = router;
