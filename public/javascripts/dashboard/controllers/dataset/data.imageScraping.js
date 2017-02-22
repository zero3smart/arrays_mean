angular.module('arraysApp')
    .controller('ImageScrapingDialogCtrl',['$scope','$mdDialog','$filter','dataset', 
        function($scope, $mdDialog, $filter, dataset) {

    
        $scope.isSrcSet = function(isSrcSet,field) {
            if (!isSrcSet) {
                delete field.resize;
            } else {
                delete field.size;
            }
        }


        $scope.reset = function () {
            $scope.dataset = angular.copy(dataset);
            $scope.data = {};

            if (!$scope.dataset.imageScraping) { $scope.dataset.imageScraping = []; }

            var index = 0;
            for (var i = 0; i < $scope.dataset.imageScraping.length ; i++) {
                $scope.dataset.imageScraping[i].setFields.map(function(field) {

                  
                    var fieldName = field.newFieldName;
                    delete $scope.dataset.fe_excludeFields[fieldName];
                });
            }

            $scope.availableDesignatedFields = availableDesignatedFields;

            if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
            $scope.data.designatedFields = {};
            for (var key in $scope.dataset.fe_designatedFields) {
                $scope.data.designatedFields[$scope.dataset.fe_designatedFields[key]] = key;
            }

            if ($scope.dialog.form) $scope.dialog.form.$setPristine();
        };

        $scope.reset();

        $scope.addImageToScrap = function () {
            $scope.dataset.imageScraping.push({
                htmlSourceAtURLInField: '',
                setFields: [
                    {
                        newFieldName: '',
                        prependToImageURLs: '',
                        resize: 200
                    }
                ]
            });

        };

        if (!$scope.dataset.imageScraping.length) { $scope.addImageToScrap(); }

        $scope.removeImageToScrap = function (index) {
            $scope.dataset.imageScraping.splice(index, 1);
            $scope.dialog.form.$setDirty();
        };

        $scope.addField = function (setFields) {
            setFields.push({
                newFieldName: '',
                prependToImageURLs: '',
                resize: 200
            });


        };

        $scope.removeField = function (setFields, index) {
            setFields.splice(index, 1);
            $scope.dialog.form.$setDirty();
        };


        $scope.verifyUniqueHtmlSource = function (imageScraping, index) {
            var unique = true;
            $scope.dataset.imageScraping.forEach(function (_imageScraping) {
                if (_imageScraping == imageScraping) return;

                if (imageScraping.htmlSourceAtURLInField == _imageScraping.htmlSourceAtURLInField)
                    unique = false;
            });

            $scope.dialog.form['imageScrapingField_' + index].$setValidity('unique', unique);

            // if newFieldName is blank, auto assign name // for demo
            // don't change if exists -- change in the format field modal
            imageScraping.setFields.forEach(function (field, i) {
                if(field.newFieldName === '') {
                    var sourceFieldName = imageScraping.htmlSourceAtURLInField;
                    field.newFieldName = sourceFieldName + '_scraped_' + i;
                }
            });
        };

        $scope.verifyValidNewFieldName = function (fieldName, index) {



            var unique = true, valid = true;
            $scope.dataset.imageScraping.forEach(function (_imageScraping) {
                var i = 0;
                _imageScraping.setFields.forEach(function (field) {
                    if (field.newFieldName == fieldName && i != index) unique = false;
                    i++;
                });
            });

            if ($filter('dotless')(fieldName) != fieldName) valid = false;

            $scope.dialog.form['newField_' + index].$setValidity('unique', unique);
            $scope.dialog.form['newField_' + index].$setValidity('valid', valid);
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.save = function () {

            for (var fieldName in $scope.data.designatedFields) {
                $scope.dataset.fe_designatedFields[$scope.data.designatedFields[fieldName]] = fieldName;
            }

            if ($scope.dataset.skipImageScraping == false && $scope.dataset.dirty == 0) {
                $scope.dataset.dirty = 4;
            }
            
            $mdDialog.hide($scope.dataset);
        };
            




		
}])


