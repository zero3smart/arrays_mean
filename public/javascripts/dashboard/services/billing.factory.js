(function() {
    angular.module('arraysApp')
        .factory('Account', function($resource) {
            return $resource('api/billing/account', null, {
                'update': { method: 'PUT' }
            });
        })
        .factory('Billing', function($resource) {
            return $resource('api/billing/billingInfo', null, {
                'update': { method: 'PUT' }
            });
        })
        .factory('Subscriptions', function($resource) {
            return $resource('api/billing/subscriptions/:subscrId', null, {
                'update': { method: 'PUT' },
                'cancel': {
                    method: 'PUT',
                    params: { subscrId: '@subscrId' },
                    url: 'api/billing/subscriptions/:subscrId/cancel'
                },
                'reactivate': {
                    method: 'PUT',
                    params: { subscrId: '@subscrId' },
                    url: 'api/billing/subscriptions/:subscrId/reactivate'
                }
            });
        })
        .factory('Plans', function($resource) {
            return $resource('api/billing/plans/:plan_code', null, {
                'update': { method: 'PUT' }
            });
        })
        .factory('Invoices', function($resource) {
            return $resource('api/billing/invoices/:invoiceId', null, {});
        });
})();
