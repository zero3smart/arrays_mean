var express = require('express');
var router = express.Router();

var auth = require('http-auth');
var ipfilter = require('express-ipfilter');

var bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);

var Team = require('../models/teams');

var Recurly = require('node-recurly');
var recurlyConfig = {
    API_KEY: process.env.RECURLY_API_KEY ? process.env.RECURLY_API_KEY : null,
    SUBDOMAIN: process.env.RECURLY_SUBDOMAIN ? process.env.RECURLY_SUBDOMAIN : 'schema',
    DEBUG: process.env.RECURLY_DEBUG ? process.env.RECURLY_DEBUG : false
};
var recurly = new Recurly(recurlyConfig);


// Basic HTTP Auth for Recurly Webhooks
var authConfig = {
    RECURLY_WEBHOOKS_USERNAME: process.env.RECURLY_WEBHOOKS_USERNAME ? process.env.RECURLY_WEBHOOKS_USERNAME : '',
    RECURLY_WEBHOOKS_PASSWORD: process.env.RECURLY_WEBHOOKS_PASSWORD ? process.env.RECURLY_WEBHOOKS_PASSWORD : ''
};

var basic = auth.basic({
    realm: 'recurly'
}, function(username, password, callback) {
    // Use callback(error) if you want to throw async error.
    callback(username === authConfig.RECURLY_WEBHOOKS_USERNAME && password === authConfig.RECURLY_WEBHOOKS_PASSWORD);
});

router.use(auth.connect(basic));


// Filter IP Addresses to only allow requests from Recurly Webhooks servers
var IpDeniedError = ipfilter.IpDeniedError;
var allowedIPs = [
    '50.18.192.88',
    '52.8.32.100',
    '52.9.209.233',
    '50.0.172.150',
    '52.203.102.94',
    '52.203.192.184',
    // '127.0.0.1' // Local IP Address
];

// Whitelist IPs
router.use(ipfilter.IpFilter(allowedIPs, {
    mode: 'allow', // Whitelist these IPs
    allowedHeaders: ['x-forwarded-for'] // Fix for Heroku IP forwarding
}));


// Parse XML
router.use(bodyParser.xml());


// Handle IP Filter errors
router.use(function(err, req, res, next) {
    // console.log('Webhooks Error:', err.name + ': ' + err.message);
    if (err instanceof IpDeniedError) {
        res.status(401).send('401 Unauthorized');
    } else {
        res.status(err.status || 500).send('Webhooks Error');
    }
});


// Process XML requests
router.post('/', function(req, res) {

    var notifications = [
        'new_subscription_notification',
        'updated_subscription_notification',
        'canceled_subscription_notification',
        'expired_subscription_notification',
        'renewed_subscription_notification'
    ];

    var body = req.body;

    var matchFound = false;
    var notificationsLength = notifications.length;
    for (var i = 0; i < notificationsLength; i++) {

        if ( body.hasOwnProperty(notifications[i]) ) {
            console.log('Webhook notification received: ' + notifications[i]);
            matchFound = true;
            var teamId = body[notifications[i]].account[0].account_code[0];
            var subscrId = body[notifications[i]].subscription[0].uuid[0];

            // console.log(teamId);
            // console.log(subscrId);

            recurly.subscriptions.get(subscrId.toString(), function(err, response) {
                if (err) {
                    res.status(err.statusCode).send(err);
                } else {

                    var subscription = {};

                    if (response.data.subscription) {
                        subscription = response.data.subscription;
                    }

                    Team.findByIdAndUpdate(teamId, {
                        subscription: {
                            activated_at: subscription.activated_at._,
                            canceled_at: subscription.canceled_at._,
                            current_period_ends_at: subscription.current_period_ends_at._,
                            current_period_started_at: subscription.current_period_started_at._,
                            expires_at: subscription.expires_at._,
                            plan: {
                                name: subscription.plan.name,
                                plan_code: subscription.plan.plan_code
                            },
                            quantity: subscription.quantity._,
                            remaining_billing_cycles: subscription.remaining_billing_cycles._,
                            state: subscription.state,
                            total_billing_cycles: subscription.total_billing_cycles._,
                            trial_days_left: subscription.trial_days_left,
                            trial_ends_at: subscription.trial_ends_at._,
                            trial_started_at: subscription.trial_started_at._,
                            uuid: subscription.uuid
                        }
                    }, {}, function(err, response) {
                        if (err) {
                            res.status(err.statusCode).send(err);
                        } else {
                            res.status(200).send();
                        }
                    });
                }
            });

            break; // Break out of the loop so this only runs once
        }
    }

    if (!matchFound) {
        var notificationNames = Object.getOwnPropertyNames(body);

        if (notificationNames.length) {
            console.log('Webhook notification ignored: ' + notificationNames[0]);
            res.status('202').send('Webhook notification ignored: ' + notificationNames[0]);
        }
    }
});

module.exports = router;
