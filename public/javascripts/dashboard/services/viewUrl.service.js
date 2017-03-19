angular
	.module('arraysApp')
	.service('viewUrlService', [function() {

        function makeFieldValuePairs(obj) {
            var fieldValuePairs  = [], result;
            for (var p in obj) {
                if( obj.hasOwnProperty(p) ) {
                    fieldValuePairs.push(p + '=' + obj[p]);
                }
            }
            result = fieldValuePairs.join('&');
            if (result !== '') {
                result = '?' + result;
            }
            return result;
        }

        this.getViewUrl = function(subdomain, dataset, viewName, showPreview) {

            return subdomain + '/' +
                dataset.uid +
                '-r' + dataset.importRevision + 
                ((viewName !== null) ? '/' + viewName.split(/(?=[A-Z])/).join('-').toLowerCase()  : '') +
                makeFieldValuePairs(dataset.fe_filters.default) + (showPreview ? '?preview=true' : '');
        };

}]);
