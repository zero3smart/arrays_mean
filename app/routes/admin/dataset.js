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
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.render('admin/dataset/index', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            user: req.user
        }));
    });
});


//
router.get('/new/settings', ensureLoggedIn, function (req, res) {
    res.render('admin/dataset/settings', _.assign({}, {
        env: process.env,
        flash: req.flash('message'),
        user: req.user
    }));
});

router.get('/:id/settings', ensureLoggedIn, function (req, res) {
    controller.getSettings(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset settings: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.render('admin/dataset/settings', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            user: req.user
        }));
    });
});

router.post('/:id/settings', ensureLoggedIn, function (req, res) {
    controller.saveSettings(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset settings: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.redirect('/admin/dataset/' + data.id + '/source');
    });
});

//
router.get('/:id/source', ensureLoggedIn, function (req, res) {
    controller.getSource(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for the dataset source: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.render('admin/dataset/source', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            error: req.flash('error'),
            user: req.user
        }));
    });
});

router.post('/:id/source', ensureLoggedIn, upload.array('files', 12), function (req, res) {
    controller.saveSource(req, function (err) {

        if (err) {
            winston.error("❌  Error getting bind data for saving the dataset source: ", err);
            res.redirect('/admin/dataset/' + req.params.id + '/source') ;
            return;
        } 
        res.redirect('/admin/dataset/' + req.params.id + '/format-data');
    });
});

//
router.get('/:id/format-data', ensureLoggedIn, function (req, res) {
    controller.getFormatData(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format data: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.render('admin/dataset/format-data', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            user: req.user
        }));
    });
});

router.post('/:id/format-data', ensureLoggedIn, function (req, res) {
    controller.saveFormatData(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format data: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.redirect('admin/dataset/' + data.id + '/format-views');
    });
});

router.get('/:id/format-data/:field', ensureLoggedIn, function(req, res) {
    controller.getFormatField(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format field: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/format-field', data);
    });
});

router.post('/:id/format-data/:field', ensureLoggedIn, function (req, res) {
    controller.saveFormatField(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format data: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data));
    });
});

router.get('/:id/add-custom-field', ensureLoggedIn, function(req, res) {
    controller.getAddCustomField(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset add custom field: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/add-custom-field', data);
    });
});


router.get('/:id/format-views/:view',ensureLoggedIn,function(req,res) {

    controller.getFormatView(req,function(err,data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;

        }
        res.render('admin/dataset/format-view',data);

    })
});

router.get('/:id/format-views', ensureLoggedIn, function (req, res) {
    controller.getFormatViews(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }

        res.render('admin/dataset/format-views', _.assign(data, {
            env: process.env,
            flash: req.flash('message'),
            user: req.user
        }));
    });
});

router.post('/:id/format-view/:view', ensureLoggedIn, function (req, res) {
    controller.saveFormatView(req, function (err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for dataset format views: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.setHeader('Content-Type','application/json');

        res.send(JSON.stringify(data));
    });
});




module.exports = router;