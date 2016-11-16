(function() {
	var signupModule = angular.module('signupModule');
	signupModule.directive('userInputUniqueness',['$http','$q',function($http,$q) 
	{
		return {
			restrict: 'AE',
			require: 'ngModel',
			link: function(scope,elem,attr,model) {
				model.$asyncValidators.userFieldAvailable = function(modelValue,viewValue) {

					var value = modelValue|| viewValue;
					var field = model.$name;
					var params = {};
					params[field] = value;
					var defer = $q.defer();
					$http.post('/api/user/search',params)
						.then(function(result){

							console.log("get")
							var foundUser = result.data;
							if (foundUser.length == 0) {
					
								model.$setValidity('userFieldAvailable',true);



							} else {
								model.$setValidity('userFieldAvailable',false);

							}

							defer.resolve;


						},function(err) {
							defer.reject;
						})
						return defer.promise;



				}

			}
		}

	}])

})();


