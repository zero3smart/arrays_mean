$(document).ready(function () {

    $('[data-toggle="tooltip"]').tooltip();

    $('form.removeDataset').on('submit', function(e) {
        var r = confirm('Are you sure to delete?');
        if (r == true)
            return true;
        return false;
    });

    $('#add_urls').on('click', function (e) {
        $('form#settings #extra_urls').append("<div class='form-group row'><input class='col-xs-8 col-xs-offset-4 urls' name='urls[]' type='text' value=''></div>");
    });

    $('form.upload').on('submit', function(e) {
        var files = $(this).find('input[type=file]');
        var foundSource = false;
        for (var i = 0; i < files.length; i ++) {
            if (files[i].files[0]) {
                foundSource = true;
                break;
            }
        }
        if (!foundSource) {
            alert('You should select at least a datasource to upload');
            return false;
        }
        return true;
    });

    $('#add_datasource').on('click', function (e) {
        var datasource_count = $('#datasource_count').val();
        $('#datasource_count').val(++datasource_count);

        $('#add_datasource').parent().before(
            '<div class="form-group">' +
            '<div class="row">' +
            '<div class="col-xs-11">' +
            '<h4>Datasource ' + datasource_count + '</h4>' +
            '</div>' +
            '<div class="col-xs-1">' +
            '<a class="removeDatasource"><span class="glyphicon glyphicon-remove"></span></a>' +
            '</div>' +
            '</div>' +
            '<div class="row">' +
            '<div class="col-xs-5">' +
            '<label for="file_' + datasource_count + '">Select a CSV/TSV file To Upload</label>' +
            '</div>' +
            '<div class="col-xs-6">' +
            '<input type="file" id="file_' + datasource_count + '" name="files[]" accept=".csv,.tsv|text/csv,text/csv-schema" />' +
            '</div>' +
            '</div>' +
            '</div>'
        );
    });

    $('.datasource').on('click', '.removeDatasource', function (e) {
        e.preventDefault();
        var datasource_count = $('.upload input[type=file]').length;
        if (datasource_count == 1) {
            return alert('You should have at least a datasource');
        }
        $(this).closest('.form-group').remove();

        // TODO - Remove the datsource schema from the database.
    });

    $('.format-data tr.field').on('click', function (e) {
        e.preventDefault();

        var field_name = $(this).attr('data-field-name');
        var doc_id = $('#doc_id').val();
        var doc_title = $('#doc_title').val();

        $.get("/admin/dataset/" + doc_id + "/format-field/" + field_name, null, function (data) {

            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Format Field - ' + doc_title);
                    $modalBody.html(data);
                })
                .modal();

        }, "html");
    });

    $('.format-data tr.custom-field').on('click', function (e) {
        e.preventDefault();

        var field_name = $(this).attr('data-field-name');
        var doc_id = $('#doc_id').val();
        var doc_title = $('#doc_title').val();

        $.get("/admin/dataset/" + doc_id + "/format-custom-field/" + field_name + '/edit', null, function (data) {

            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Format Custom Field - ' + doc_title);
                    $modalBody.html(data);
                    $(".chosen-select").chosen({width: "100%"});
                    /* start multiselect */
                })
                .modal();

        }, "html");
    });

    $('#newCustomField').on('click', function (e) {
        var doc_id = $('#doc_id').val();

        $.get("/admin/dataset/" + doc_id + "/format-custom-field/new", null, function (data) {
            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Format New Custom Field');
                    $modalBody.html(data);
                    $(".chosen-select").chosen({width: "100%"});
                })
                .modal('show');
        }, "html");
    });

    $('#modal').on('click', '#format-field-remove', function (e) {
        var r = confirm('Are you sure to remove?');
        if (r != true) return;

        var doc_id = $('#doc_id').val();
        var field = $('#name').val();

        var params = $('form.format-field').serialize();

        $.post("/admin/dataset/" + doc_id + "/format-custom-field/" + field + "/remove", params)
            .done(function (data) {

                if (data.error && data.error != '') {

                    $('.format-field .alert-danger').html(data.error).removeClass('hidden').addClass('show');

                } else {

                    $('.format-field .alert-danger').html(data.error).addClass('hidden');

                    $('tr.field[data-field-name="' + field + '"]').remove();

                    $('#changed').val(true);
                    $('#modal').modal('hide');

                }
            }, 'json');
    });

    $('#modal').on('click', '#format-field-done', function (e) {
        var doc_id = $('#doc_id').val();
        var params = $('form.format-field').serialize();

        var valid = true;

        $('form.format-field').find('[required]').each(function(){
            if (!$(this).val()) {
                valid = false;
            }
        });

        if (!valid) return alert('It seems you didn\'t input at least a column required!');

        // TODO: Consider to ask for user to login since of expiration

        if ($('#custom_mode').val() == 'true') {

            var field = $('#field').val();
            var url = "/admin/dataset/" + doc_id + "/format-custom-field/";
            url += field == '' ? 'save' : (field + '/update');

            $.post("/admin/dataset/" + doc_id + "/format-custom-field/save", params)
                .done(function (data) {
                    if (data.error && data.error != '') {
                        $('.format-field .alert-danger').html(data.error).removeClass('hidden').addClass('show');

                    } else {
                        $('.format-field .alert-danger').html(data.error).addClass('hidden');

                        var doc = data.doc;
                        var field = data.customField;
                        $('table#fields tbody').append(
                            '<tr class="field" data-field-name="' + field.fieldName + '">' +
                            '<td scope="row">' + (data.columnIndex) + '</td>' +
                            '<td>' + field.fieldName + '</td>' +
                            '<td>' + field.fieldType + '</td>' +
                            '<td>' + field.firstRecord + '</td>' +
                            '</tr>'
                        );

                        $('#changed').val(true);
                        $('#modal').modal('hide');
                    }
                }, 'json');

        } else {
            var field_name = $('#name').val(); /* un-finalized, contains . */
            var field = $('#field').val(); /* finalized */

            $.post("/admin/dataset/" + doc_id + "/format-field/" + field, params)
                .done(function (data) {

                    $('.format-field .alert-danger').html(data.error).addClass('hidden');

                
                    //
                    $('tr.field[data-field-name="' + field_name + '"] td:nth-child(2) input[type="checkbox"]').prop("checked", data.doc.fe_excludeFields.indexOf(field) != -1);
                    $('tr.field[data-field-name="' + field_name + '"] td:nth-child(4)').html(fieldDataType_coercion_toString(data.doc.raw_rowObjects_coercionScheme[field]));
                    $('tr.field[data-field-name="' + field_name + '"] td:nth-child(6)').html(data.doc.fe_fieldDisplayOrder[field]);

                    $('#changed').val(true);
                    $('#modal').modal('hide');
                }, 'json');

        }
    });

    $('#modal').on('click', '#add_oneToOneOverrideWithValuesByTitle', function (e) {
        e.preventDefault();
        $('#extra_oneToOneOverrideWithValuesByTitle').append(
            "<div class='form-group row'>" +
            "<div class='col-xs-5'>" +
            "<label>Title</label>" +
            "<input type='text' name='oneToOneOverrideWithTitle[]' class='form-control' value=''>" +
            "</div>" +
            "<div class='col-xs-6'>" +
            "<label>Override</label>" +
            "<input type='text' name='oneToOneOverrideWithValue[]' class='form-control' value=''>" +
            "</div>" +
            "<div class='col-xs-1'><a class='removeRow'><span class='glyphicon glyphicon-remove'></span></a></div>" +
            "</div>"
        );
    });

    $('#modal').on('click', '.removeRow', function (e) {
        e.preventDefault();
        $(this).closest('.form-group.row').remove();
    });

    $('#modal').on('click', '#add_valueToExcludeByOriginalKey', function (e) {
        e.preventDefault();
        $('#extra_valuesToExcludeByOriginalKey').append(
            '<div class="form-group row">' +
            '<div class="col-xs-6">' +
            '<input type="text" class="form-control" name="valuesToExcludeByOriginalKey[]" value="">' +
            '</div>' +
            '<div class="col-xs-5">' +
            '<input type="checkbox" name="valuesToExcludeByOriginalKey_applyTo[]" value="true"/> Apply to All' +
            '</div>' +
            '<div class="col-xs-1">' +
            '<a class="removeRow"><span class="glyphicon glyphicon-remove"></span></a>' +
            '</div>' +
            '</div>');
    });

    $('#modal').on('click', '#add_nested_valueOverride', function(e) {
        e.preventDefault();
        $('#extra_nested_valueOverrides').append(
            '<div class="form-group row">' +
            '<div class="col-xs-offset-1 col-xs-4">' +
            '<input type="text" class="form-control" name="nested_valueOverride_keys[]" value=""/>' +
            '</div>' +
            '<div class="col-xs-1">=></div>' +
            '<div class="col-xs-4">' +
            '<input type="text" class="form-control" name="nested_valueOverride_values[]" value=""/>' +
            '</div>' +
            '<div class="col-xs-2">' +
            '<a class="removeRow"><span class="glyphicon glyphicon-remove"></span></a>' +
            '</div>' +
            '</div>'
        );
    });

    $('#modal').on('click', '.show-more-settings', function (e) {
        if ($('.format-field .more-settings').is(':visible')) {
            $('.format-field .more-settings').hide();
            $('.format-field .show-more-settings').html('Show More Settings');
        } else {
            $('.format-field .more-settings').show();
            $('.format-field .show-more-settings').html('Hide Settings');
        }
    });

    $('#modal').on('click', '#add_filterKeyword', function (e) {
        e.preventDefault();
        $('#extra_keywords').append(
            '<div class="form-group row">' +
            '<div class="col-xs-8">' +
            '<input type="text" class="form-control" name="keywords[]" value="">' +
            '</div>' +
            '<div class="col-xs-3">' +
            '<input type="checkbox" name="default_filter_keywords[]" values="true"> Use default' +
            '</div>' +
            '<div class="col-xs-1">' +
            '<a class="removeRow"><span class="glyphicon glyphicon-remove"></span></a>' +
            '</div>' +
            '</div>'
        );
    });

    function fieldDataType_coercion_toString(field) {
        if (!field) return 'String';

        var opName = field.operation;
        if (opName == 'ProxyExisting') {
            return 'Proxy';
        } else if (opName == 'ToDate') {
            return 'Date';
        } else if (opName == 'ToInteger') {
            return 'Integer';
        } else if (opName == 'ToFloat') {
            return 'Float';
        } else if (opName == 'ToStringTrim') {
            return 'String Trim';
        } else {
            return 'String'; // 'Unknown'
        }
    }

    $('#fabricatedFilters').on('click', function(e) {
        var doc_id = $('#doc_id').val();

        $.get("/admin/dataset/" + doc_id + "/fabricated-filters", null, function (data) {
            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Fabricated Filters');
                    $modalBody.html(data);
                    $(".chosen-select").chosen({width: "100%"});
                })
                .modal('show');
        }, "html");
    });

    $('.format-views tr.views').on('click', function (e) {
        e.preventDefault();

        var viewType = $(this).attr('view-type-name');
        var doc_id = $('#doc_id').val();
        var doc_title = $('#doc_title').val();

        $.get("/admin/dataset/" + doc_id + "/format-views/" + viewType, null, function (data) {
            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Format View - ' + doc_title);
                    $modalBody.html(data);
                    $(".chosen-select").chosen({width: "100%"});  
                    /* start multiselect */
                    $(".startEmpty").spectrum({allowEmpty:true,showInput:true,preferredFormat: "hex",appendTo:"#modal"}) 
                    /*start colorpicker */

                })
                .modal();

        }, "html");

    });



    $('#modal').on('click','.addTemplateInView ',function(e) {
        var settingName = $(this).attr('field-name');
        var template = $('#template_'+settingName).clone().find(':selected').removeAttr('selected').end();
        template.find("input").attr("value","");
        var className = "templateClone_"+settingName;
        $('#addMoreTemplates_' + settingName).append("<div class='templateClone " + className+"'>" + template.html()+ "</div>");
    })

    $('#modal').on('click','.addColors',function(e) {
        var field = $(this).attr('field-name');
        var color_html = "<div class='col-xs-2'><input type='text' name='" + field + "[]' class='startEmpty form-control' value=''</div>";
        $('#addColorsTo').append(color_html);
        $('.startEmpty').spectrum({allowEmpty:true,showInput:true,preferredFormat: "hex",appendTo:"#modal"});

    })

    $('#modal').on('click','#saveFormatView',function(e) {

        var doc_id = $('#doc_id').val();
        var view = $('#name').val();

        var params = form2js('format-view','.',true);

        // 'form#format-view'


        jQuery.ajax ({
            url: "/admin/dataset/" + doc_id + "/format-view/" + view,
            type: "POST",
            data: JSON.stringify(params) ,
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function(data){

                var display_name = $('td span#' + data.default_view).attr('view-display-name');
                $('#showDefault_view').text(display_name);
                if (typeof data.visible != undefined) {
                    $('td.visibility').children('input[value="'+view+'"]').prop("checked",data.visible);                      
                }

                $('#modal').modal('hide');

                
            }
        });


    })

    $('#modal').on('click','div.templateDiv a.hideTemplate',function(e) {
        e.preventDefault();

        if ($(this).attr('delete-this') == 'true') {
             $(this).closest('.templateDiv').remove();

            

        } else {
            var set = $(this).attr('field-name');

            $('div#template_' + set+ ' .reset').val('');
            $(this).closest('#template_'+set).addClass('hidden');

        }
        
    })
    $('#modal').on('click','div.templateClone a.hideTemplate',function(e) {

        e.preventDefault();

        var settingName = $(this).attr('field-name');
        $(this).closest('.templateClone_' + settingName).remove();
    })
})



    
       
