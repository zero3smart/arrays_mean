(function() {
	var signupModule = angular.module('signupModule');
	signupModule.directive('uniqueEmail',['$q','User',function($q,User) 
	{
		return {
			restrict: 'AE',
			require: 'ngModel',
			link: function(scope,elem,attr,model) {
				model.$asyncValidators.emailAvailable = function(modelValue,viewValue) {
					var value = modelValue|| viewValue;
					var params = {email: value }
					var deferred = $q.defer();


					User.query(params)
						.$promise.then(function() {
							
						})

					// $http.post('api/user/search',params).then(
					// 	function(result) {
					// 		if (result.data.length == 0) {
					// 			deferred.resolve(true);
					// 		} else {
					// 			if (!result.data[0]._team) {
					// 				scope.user = result.data[0];
					// 				deferred.resolve(true);

					// 			} else {
					// 				deferred.reject(false);
					// 			}

								
					// 		}
							
					// 	},function(){
					// 		deferred.reject(false);

					// 	})

					return deferred.promise;
				}

			}
		}

	}])

})();


