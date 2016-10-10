var winston = require('winston');
var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/auth/login');
var router = express.Router();

var controller = require('../../controllers/admin/dataset');

router.get('/', ensureLoggedIn, function(req, res) {
    controller.index(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset index: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/index', data);
    });
});

//
router.get('/new/source', ensureLoggedIn, function(req, res) {
    controller.getSource(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for a dataset new source: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/source', data);
    });
});

router.get('/:id/source', ensureLoggedIn, function(req, res) {
    controller.getSource(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for the dataset source: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/source', data);
    });
});

router.post('/new/source', ensureLoggedIn, function(req, res) {
    controller.saveSource(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for saving a dataset new source: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.redirect('/admin/dataset/' + data.id + '/format');
    });
});

router.post('/:id/source', ensureLoggedIn, function(req, res) {
    controller.saveSource(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for saving the dataset source: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.redirect('/admin/dataset/' + data.id + '/format');
    });
});

//
router.get('/:id/format', ensureLoggedIn, function(req, res) {
    controller.getFormat(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset format: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/format', data);
    });
});

//
router.get('/:id/settings', ensureLoggedIn, function(req, res) {
    controller.getSettings(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset settings: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.render('admin/dataset/settings', data);
    });
});

router.get('/sign-s3', ensureLoggedIn, function(req, res) {
    controller.signS3(req, function(err, data) {
        if (err) {
            winston.error("❌  Error getting bind data for Dataset signS3: ", err);
            res.status(500).send(err.response || 'Internal Server Error');

            return;
        }
        res.write(JSON.stringify(data));
        res.send();
    });
});

module.exports = router;