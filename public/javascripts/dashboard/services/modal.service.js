
angular
	.module('arraysApp')
	.service('modalService',['$mdDialog',function($mdDialog) {

		var openFieldDialog = function(data) {
			var fieldTemplate = data.filterOnly? 'templates/blocks/data.field.filter.html' : 'templates/blocks/data.field.general.html';
			return $mdDialog.show({
				controller: 'FieldDialogCtrl',
				controllerAs: 'dialog',
				templateUrl: fieldTemplate,
				clickOutsideToClose: true,
				fullscreen: true,
				locals: {
					fieldName: data.fieldName,
					firstRecord: data.firstRecord,
					dataset: data.dataset,
					availableTypeCoercions: data.availableTypeCoercions,
					availableDesignatedFields: data.availableDesignatedFields,
					custom: data.custom,
					customFieldIndex: data.customFieldIndex,
					filterOnly: data.filterOnly
				}
			})

		}

		var openNestedDialog = function(data) {

			return $mdDialog.show({
                controller: 'NestedDialogCtrl',
                controllerAs: 'dialog',
                templateUrl: 'templates/blocks/data.nested.html',
                clickOutsideToClose: true,
                fullscreen: true, // Only for -xs, -sm breakpoints.
                locals: {
                    dataset: data.dataset,
                    additionalDatasources: data.additionalDatasources
                }
            })
		}

		var openFabricatedFilterDialog = function(data) {

			return $mdDialog.show({
                controller: 'FabricatedFilterDialogCtrl',
                controllerAs: 'dialog',
                templateUrl: 'templates/blocks/data.filters.html',
                clickOutsideToClose: true,
                fullscreen: true, // Only for -xs, -sm breakpoints.
                locals: {
                    dataset: data.dataset,
                    colsAvailable: data.colsAvailable,
                    fields: data.fields,
                    openFieldDialog: data.openFieldDialog
                }
            })

		}

		var openJoinDialog = function(data) {
			return $mdDialog.show({
                controller: 'JoinDialogCtrl',
                controllerAs: 'dialog',
                templateUrl: 'templates/blocks/data.join.html',
                clickOutsideToClose: true,
                fullscreen: true, // Only for -xs, -sm breakpoints.
                locals: {
                    dataset: data.dataset,
                    fields: data.fields
                }
            })
		}

		var openJoinTableDialog = function(data) {
			return $mdDialog.show({
                locals: {
                    dataset: data.dataset,
                    DatasetService: data.DatasetService,
                },
                controller: 'JoinTableDialogCtrl',
                templateUrl: 'templates/blocks/data.joinTables.html',
                clickOutsideToClose: true
            })
		}

		var openImageScrapingDialog = function (data) {

			return $mdDialog.show({
                controller: 'ImageScrapingDialogCtrl',
                controllerAs: 'dialog',
                templateUrl: 'templates/blocks/data.imagescraping.html',
                clickOutsideToClose: true,
                fullscreen: true, // Only for -xs, -sm breakpoints.
                locals: {
                    dataset: data.dataset
                }
            })
		}
		

		this.openDialog = function(type,data) {
			if (type == 'field') {
				return openFieldDialog(data)
			} else if (type == 'nested') {
				return openNestedDialog(data);
			} else if ( type == 'fabricated') {
				return openFabricatedFilterDialog(data);
			} else if (type == 'join') {
				return openJoinDialog(data);
			} else if (type == 'joinTables') {
				return openJoinTableDialog(data);
			} else if (type == 'imageScraping') {
				return openImageScrapingDialog(data);
			}

		}



	}])



