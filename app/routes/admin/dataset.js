var winston = require('winston');
var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var router = express.Router();
var _ = require('lodash');
var path = require('path');
var multer  = require('multer');
var upload = multer({ dest: path.join(__dirname, '../../../tmp') });

var controller = require('../../controllers/admin/dataset');

router.get('/', ensureLoggedIn, function (req, res) {
    controller.index(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset index: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/index', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});


//
router.post('/remove', ensureLoggedIn, function(req, res) {
    controller.removeDataset(req, function(err, data) {
        if (err) {
            winston.error("❌  Error removing dataset : ", err);
            req.flash('error', err.message);
        }

        res.redirect('/admin/dataset');
    });
});

//
router.get('/new/settings', ensureLoggedIn, function (req, res) {
    res.render('admin/dataset/settings', _.assign({}, {
        env: process.env,
        flash: req.flash('message'),
        error: req.flash('error'),
        user: req.user
    }));
});

router.get('/:id/settings', ensureLoggedIn, function (req, res) {
    controller.getSettings(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset settings: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/settings', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});

router.post('/:id/settings', ensureLoggedIn, function (req, res) {
    controller.saveSettings(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset settings: ", err);
            req.flash('error', err.message);
        }

        res.redirect('/admin/dataset/' + data.id + '/source');
    });
});

//
router.get('/:id/source', ensureLoggedIn, function (req, res) {
    controller.getSource(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for the dataset source: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/source', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});


router.post('/:id/source', ensureLoggedIn, upload.array('files[]', 12), function (req, res) {

    controller.saveSource(req, function (err) {

        if (err) {
            winston.error("❌  Error getting bind data for saving the dataset source: ", err);
            req.flash('error', err.message);
            return res.redirect('/admin/dataset/' + req.params.id + '/source') ;
        } 

        res.redirect('/admin/dataset/' + req.params.id + '/format-data');
    });
});

//
router.get('/:id/format-data', ensureLoggedIn, function (req, res) {
    controller.getFormatData(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format data: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/format-data', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});

router.post('/:id/format-data', ensureLoggedIn, function (req, res) {
    controller.saveFormatData(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format data: ", err);
            req.flash('error', err.message);

            return res.render('/admin/dataset/' + data.id + '/format-data', {
                env: process.env,
                err: req.flash('error'),
                user: req.user
            });
        }

        res.redirect('/admin/dataset/' + req.params.id + '/format-views');
    });
});

router.get('/:id/format-field/:field', ensureLoggedIn, function(req, res) {
    controller.getFormatField(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format field: ", err);
            req.flash('error', err.message);

            return res.redirect('/admin/dataset/' + req.params.id + '/format-data');
        }

        res.render('admin/dataset/format-field', data);
    });
});

router.post('/:id/format-field/:field', ensureLoggedIn, function (req, res) {
    controller.saveFormatField(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format data: ", err);
            req.flash('error', err.message);
        }

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data));
    });
});


// Custom Field
router.get('/:id/format-custom-field/new', ensureLoggedIn, function(req, res) {
    controller.getFormatNewCustomField(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset add custom field: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/format-field', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});

router.get('/:id/format-custom-field/:field', ensureLoggedIn, function(req, res) {
    controller.getFormatCustomField(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset add custom field: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/format-field', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});


// Format Views
router.get('/:id/format-views/:view',ensureLoggedIn,function(req,res) {

    controller.getFormatView(req,function(err,data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/format-view',_.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));

    })
});

router.get('/:id/format-views', ensureLoggedIn, function (req, res) {
    controller.getFormatViews(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/format-views', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});

router.post('/:id/format-view/:view', ensureLoggedIn, function (req, res) {
    controller.saveFormatView(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            req.flash('error', err.message);
        }

        res.setHeader('Content-Type','application/json');

        res.send(JSON.stringify(data));
    });
});

router.get('/:id/done', ensureLoggedIn, function (req, res) {
    controller.getFormatViews(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            req.flash('error', err.message);
        }

        res.render('admin/dataset/done', _.assign(data, {
            env: process.env,
            error: req.flash('error'),
            user: req.user
        }));
    });
});

module.exports = router;