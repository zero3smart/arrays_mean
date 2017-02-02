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
					var params = {email: value };
					var deferred = $q.defer();
					User.search(params)
						.$promise.then(function(data) {
							if (data.length == 0) {
								deferred.resolve(true);
							} else {

								if (data[0].activated) {
									deferred.reject(false);

								} else {
									scope.user = data[0];
									deferred.resolve(true);
								}


							}

						},function() {
							deferred.reject(false);
						})
					return deferred.promise;
				}

			}
		}

	}])

	signupModule.directive('passwordChecker',function() {
		return {
			restrict: 'A',
			require: 'ngModel',
			scope: {
				matchTarget: '='

			},
			link : function(scope,elem,attr,model) {
				var validator = function(value) {
					model.$setValidity('match', value === scope.matchTarget);
					return value;
				}
				model.$parsers.unshift(validator);
				model.$formatters.push(validator);

				scope.$watch('matchTarget',function() {
					validator(model.$viewValue);
				})
			}
		}

	})



	signupModule.directive('uniqueSubdomain',['$q','Team',function($q,Team)
	{
		return {
			restrict: 'AE',
			require: 'ngModel',
			link: function(scope,elem,attr,model) {


				model.$asyncValidators.subdomainAvailable = function(modelValue,viewValue) {



					var value = modelValue|| viewValue;
					var params = {subdomain: value};
					var deferred = $q.defer();

					if (value == 'app' && !scope.isEnterprise) {
						deferred.reject(false);
					} else {
						if (scope.invitedUser) {
							deferred.resolve(true);
						} else {
							Team.search(params)
							.$promise.then(function(data) {
								if (data.length == 0) {
									deferred.resolve(true);
								} else {
									deferred.reject(false);
								}

							},function() {
								deferred.reject(false);
							})

						}
					}
					return deferred.promise;
				}

			}
		}

	}])


	signupModule.directive('subdomainSuggestion',['$q','Team', function($q,Team) {
		return {
			restrict: 'E',
			scope : {
				title : '=teamTitle',
				subdomain: '=subdomain'
			},
			templateUrl: 'templates/blocks/signup.subdomain.html',
			link: function(scope,elem,attr) {

				var prepositions = ["of","at","for"];

				scope.$watch('title',function(value) {

					if (typeof value !== 'undefined') {
						var titleString = value.toLowerCase();
						var noSpecialChars = titleString.replace(/\'/g, "").replace(/[^a-z0-9\-]/g, " ");
						var split = noSpecialChars.split(" ");
						var filtered = split.filter(function(val) { return val !== "" && prepositions.indexOf(val) == -1 });

						var suggestedSubdomain = "";
						if (filtered.length == 1) {
							suggestedSubdomain = filtered[0];
						} else {
							for (var i = 0; i < filtered.length ; i++) {
								suggestedSubdomain += filtered[i].charAt(0);
							}
						}


						var params = {subdomain: suggestedSubdomain};
						Team.search(params)
							.$promise.then(function(data) {
								if (data.length == 0) {
									scope.subdomainSuggestion = suggestedSubdomain
								}
							})

					}

				})
			},
			controller: function($scope) {
				$scope.setSubdomain = function() {
					$scope.subdomain = $scope.subdomainSuggestion;
				}
			}
		}

	}])

})();
