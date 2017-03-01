angular.module('arraysApp')
    .controller('FabricatedFilterDialogCtrl',['$scope','$mdDialog','$filter','dataset',
    	'colsAvailable', 'openFieldDialog','fields', function($scope, $mdDialog, $filter, dataset, colsAvailable, openFieldDialog, fields) {


            
        $scope.colsAvailable = colsAvailable;
        $scope.openFieldDialog = openFieldDialog;
        $scope.fields = fields;
        $scope.indexInFabricatedFilter = function (input) {
            for (var i = 0; i < $scope.dataset.fe_filters.fabricated.length; i++) {
                var currentFab = $scope.dataset.fe_filters.fabricated[i];
                if (currentFab.title == input) {
                    return i;
                }
            }
            return -1;
        };

        $scope.reset = function () {
            $scope.dataset = angular.copy(dataset);
            $scope.data = {};

            $scope.dataset.fe_filters.fabricated.map(function (fabricated) {
                fabricated.choices[0].match.field = fabricated.choices[0].match.field.replace('rowParams.', '');
            });

            $scope.data.defaultFilters = [];
            for (var name in $scope.dataset.fe_filters.default) {
                $scope.data.defaultFilters.push({name: name, value: $scope.dataset.fe_filters.default[name]});
            }

            if ($scope.dialog.form) $scope.dialog.form.$setPristine();
        };

        $scope.reset();

        $scope.verifyUniqueFabricated = function (fabricated, index) {
            var fabricatedTitleUnique = true, fabricatedValueUnique = true;

            $scope.dataset.fe_filters.fabricated.forEach(function (elem) {
                if (fabricated == elem) return;

                if (fabricated.title == elem.title)
                    fabricatedTitleUnique = false;
                if (fabricated.choices[0].title == elem.choices[0].title)
                    fabricatedValueUnique = false;

            });
            $scope.dialog.form['fabricatedTitle_' + index].$setValidity('unique', fabricatedTitleUnique);
            $scope.dialog.form['fabricatedValue_' + index].$setValidity('unique', fabricatedValueUnique);
        };

        $scope.toggleFilter = function(col) {
            var fieldsNA = $scope.dataset.fe_filters.fieldsNotAvailable,
                ndex = fieldsNA.indexOf(col);
            if (ndex == -1) {
                fieldsNA.push(col);
            } else {
                fieldsNA.splice(ndex, 1);
            }
            $scope.dialog.form.$setDirty();
            // also set dataset to dirty, needs processing
            if ($scope.dataset.dirty !== 1) {
                $scope.dataset.dirty = 3;
            }
        };

        $scope.editFilter = function(evt, field) {
            if ($scope.dialog.form.$dirty || $scope.dialog.form.$valid) {
                $scope.save();
            } else {
                $scope.cancel();
            }
            $scope.openFieldDialog(field.name, field.sample, field.custom, field.customFieldIndex, true);
        };

        $scope.addFabricated = function () {
            var emptyFabricated = $scope.dataset.fe_filters.fabricated.find(function (elem) {
                return elem.title == '' && elem.choices[0].match.field == 'rowParams.' + fieldName;
            });
            if (emptyFabricated) return;

            $scope.dataset.fe_filters.fabricated.push({
                title: '',
                choices: [
                    {
                        title: '',
                        match: {
                            field: '',
                            exist: true,
                            nin: []
                        }
                    }
                ]
            });
            $scope.dialog.form.$setDirty();
        };

        $scope.removeFabricated = function (fabricated) {
            var index = $scope.dataset.fe_filters.fabricated.indexOf(fabricated);
            if (index != -1) {
                $scope.dataset.fe_filters.fabricated.splice(index, 1);
                $scope.dialog.form.$setDirty();
            }
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.verifyUniqueDefaultFilter = function (defaultFilter, index) {
            var defaultFilterUnique = true;

            $scope.data.defaultFilters.forEach(function (elem) {
                if (defaultFilter == elem) return;

                if (defaultFilter.name == elem.name && elem.value == defaultFilter.value)
                    defaultFilterUnique = false;

            });
            $scope.dialog.form['defaultValue_' + index].$setValidity('unique', defaultFilterUnique);
        };

        $scope.removeDefaultFilter = function (index) {
            $scope.data.defaultFilters.splice(index, 1);
            $scope.dialog.form.$setDirty();
        };

        $scope.addDefaultFilter = function () {
            $scope.data.defaultFilters.push({name: '', value: ''});
        };

        $scope.save = function () {
            var _newDefaultFilters = {};

            $scope.dataset.fe_filters.fabricated.map(function (fabricated) {
                fabricated.choices[0].match.field = 'rowParams.' + fabricated.choices[0].match.field;
            });

            // overwrite defaultFilters so removed filters are--removed
            $scope.data.defaultFilters.forEach(function (filter) {
                _newDefaultFilters[filter.name] = filter.value;
            });

            $scope.dataset.fe_filters.default = _newDefaultFilters;

            $mdDialog.hide($scope.dataset);
        };
            
}])


