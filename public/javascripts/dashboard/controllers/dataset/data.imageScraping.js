angular.module('arraysApp')
    .controller('ImageScrapingDialogCtrl',['$scope','$mdDialog','$filter','dataset', 
        function($scope, $mdDialog, $filter, dataset) {

       
        $scope.selectOptions = [
            {name: "grid thumbnail", value:"gridThumb"},
            {name: "original image", value: "originalImage"}
        ]
        $scope.keys = [];

       
        $scope.isSrcSet = function(isSrcSet,field) {
            if (!isSrcSet) {
                delete field.resize;
            } else {
                delete field.size;
            }
        }

        $scope.replaceKey = function(key,index) {

            if ($scope.data[$scope.keys[index]]) {
                $scope.keys.splice(index,1);
                delete $scope.data[$scope.keys[index]];
            }
           var original = key;
           delete $scope.data[originalImage];
           $scope.addImageToScrap($scope.keys[index]);

        }


        $scope.reset = function () {
            $scope.dataset = angular.copy(dataset);


            $scope.data = {};

            if (!$scope.dataset.gridThumb) {
                $scope.dataset.gridThumb = {};
            } else if ($scope.dataset.gridThumb && $scope.dataset.gridThumb.fieldName){
                $scope.keys.push("gridThumb");
                $scope.data["gridThumb"]  = $scope.dataset.gridThumb;

                if ($scope.dataset.gridThumb.scraped) $scope.data["gridThumb"].showAdvanced = true;
            }
            if (!$scope.dataset.originalImage) {
                $scope.dataset.originalImage = {};
            } else if ($scope.dataset.originalImage && $scope.dataset.originalImage.fieldName){
                $scope.keys.push("originalImage");
                $scope.data["originalImage"] = $scope.dataset.originalImage;

                if ($scope.dataset.originalImage.scraped) $scope.data["originalImage"].showAdvanced = true;

            }
            if ($scope.dialog.form) $scope.dialog.form.$setPristine();
        };

        $scope.reset();


        $scope.addImageToScrap = function (name) {

            if (name == "gridThumb" ||  (name == null && !$scope.data.gridThumb)) {

                if ($scope.keys.indexOf("gridThumb") == -1) {
                    $scope.keys.push("gridThumb");
                }
                

                $scope.data["gridThumb"] = {
                    fieldName: '',
                    scraped: {
                        resize: 200
                    },
                    showAdvanced: false
                };


            } else if (name == "originalImage" || (name == null && !$scope.data.originalImage)) {
                if ($scope.keys.indexOf("originalImage") == -1) {
                    $scope.keys.push("originalImage");
                }
                $scope.data["originalImage"] = {
                    fieldName: '',
                    scraped: {
                        resize: 200
                    },
                    showAdvanced: false
                };
            }


        };

        if (Object.keys($scope.data).length == 0) $scope.addImageToScrap("gridThumb");


        $scope.removeImageToScrap = function (key) {
            var i = $scope.keys.indexOf(key);
            $scope.keys.splice(i,1);
            delete $scope.data[key];
            $scope.dialog.form.$setDirty();
        };



        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.save = function () { 

            if ($scope.data.gridThumb) {
                $scope.dataset.gridThumb = $scope.data.gridThumb;
                delete $scope.dataset.gridThumb.showAdvanced;
            }

            if ($scope.data.originalImage) {
                $scope.dataset.originalImage = $scope.data.originalImage;
                 delete $scope.dataset.originalImage.showAdvanced;
            }


            if ($scope.dataset.skipImageScraping == false && $scope.dataset.dirty == 0) {

                $scope.dataset.dirty = 4;
            }

            $mdDialog.hide($scope.dataset);
        };
            




		
}])


