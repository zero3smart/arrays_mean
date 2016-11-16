(function() {
	var signupModule = angular.module('signupModule');
	signupModule.directive('uniqueEmail',['$http','$q',function($http,$q) 
	{
		return {
			restrict: 'AE',
			require: 'ngModel',
			link: function(scope,elem,attr,model) {
				model.$asyncValidators.emailAvailable = function(modelValue,viewValue) {

					var value = modelValue|| viewValue;
					var params = {};
					params["email"] = value;

					var deferred = $q.defer();

					$http.post('api/user/search',params).then(
						function(result) {
							if (result.data.length == 0) {
								deferred.resolve(true);
							} else {
								deferred.reject();
							}
							
						},function(){
							deferred.reject(false);

						})

					return deferred.promise;
				}

			}
		}

	}])

})();


