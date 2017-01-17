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
            return $resource('api/billing/subscriptions', null, {
                'update': { method: 'PUT' }
            });
        })
        .factory('Plans', function($resource) {
            return $resource('api/billing/plans/:plan_code', { plan_code: '@id' }, {
                'update': { method: 'PUT' }
            });
        });
})();
