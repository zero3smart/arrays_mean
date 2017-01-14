(function() {
    angular.module('arraysApp')
        .factory('Billing', function($resource) {
            return $resource('api/billing/billingInfo', null, {
                'update': { method: 'PUT' }
            });
        });
})();
