$(document).ready(function () {


    $('#add_urls').on('click', function (e) {
        $('form#settings #extra_urls').append("<div class='form-group row'><input class='col-xs-8 col-xs-offset-4 urls' name='urls[]' type='text' value=''></div>");
    });

    $(window).on('click', 'a#removeRow', function(e) {
        e.preventDefault();
        $(this).closest('.form-group.row').remove();
    });

    $('#file').on('change', function (e) {
        const files = $('#file')[0].files;
        const file = files[0];
        if (file == null) {
            return alert('No file selected');
        }
        $('.upload button').removeAttr('disabled');
    });

    $('.format-data tr.field').on('click', function (e) {
        e.preventDefault();

        var field_name = $(this).attr('data-field-name');
        var doc_id = $('#doc_id').val();

        $.get("/admin/dataset/" + doc_id + "/format-data/" + field_name, null, function (data) {

            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Format Field');
                    $modalBody.html(data);
                })
                .modal();

        }, "html");
    });

    $('#addCustomField').on('click', function (e) {
        var doc_id = $('#doc_id').val();

        $.get("/admin/dataset/" + doc_id + "/add-custom-field", null, function (data) {
            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');

                    $modalTitle.html('Add Custom Field');
                    $modalBody.html(data);
                })
                .modal('show');
        }, "html");
    });

    $('#modal').on('click', '#format-field-done', function (e) {
        var doc_id = $('#doc_id').val();
        var field = $('#name').val();

        var params = $('form.format-field').serialize();
        // TODO: Consider to ask for user to login since of expiration

        $.post("/admin/dataset/" + doc_id + "/format-data/" + field, params)
            .done(function (data) {
                var field_name = field.replace(/\./g, "_");
                //
                $('tr.field[data-field-name="' + field + '"] td:nth-child(2) input[type="checkbox"]').prop("checked", data.doc.fe_excludeFields.indexOf(field) != -1);
                $('tr.field[data-field-name="' + field + '"] td:nth-child(4)').html(fieldDataType_coercion_toString(data.doc.raw_rowObjects_coercionScheme[field_name]));
                $('tr.field[data-field-name="' + field + '"] td:nth-child(6)').html(data.doc.fe_fieldDisplayOrder[field]);

                $('#changed').val(true);
                $('#dataTypeCoercionChanged').val(data.dataTypeCoercionChanged);
                $('#modal').modal('hide');
            }, 'json');
    });

    $('#modal').on('click', 'a#add_oneToOneOverrideWithValuesByTitle', function(e) {
        $('#extra_oneToOneOverrideWithValuesByTitle').append(
            "<div class='form-group row'>"
                + "<div class='col-xs-4 col-xs-offset-1'>"
                + "<label>Title</label><input type='text' name='oneToOneOverrideWithTitle[]' class='form-control' value=''>"
                + "</div>"
                + "<div class='col-xs-4 col-xs-offset-1'>"
                + "<label>Override</label><input type='text' name='oneToOneOverrideWithValue[]' class='col-xs-4 col-xs-offset-1 form-control' value=''>"
                + "</div>"
                + "<div class='col-xs-1'><a class='removeRow'><span class='glyphicon glyphicon-remove'></span></a></div>"
                + "</div>"
        );
    });

    $('#modal').on('click', 'a#add_valuesToExcludeByOriginalKey', function (e) {
        $('#extra_valuesToExcludeByOriginalKey').append("<div class='form-group row'><input class='col-xs-2 col-xs-offset-1' name='valuesToExcludeByOriginalKey[]' type='text' value=''></div>");
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

    $('.format-views tr.views').on('click', function(e) {
        e.preventDefault();

        var viewType = $(this).attr('view-type-name');
        var doc_id = $('#doc_id').val();


        $.get("/admin/dataset/" + doc_id + "/format-views/" + viewType, null, function (data) {
            $('#modal')
                .on('show.bs.modal', function (e) {
                    var $modalTitle = $(this).find('.modal-title');
                    var $modalBody = $(this).find('.modal-body');
                    $modalTitle.html('Format View');
                    $modalBody.html(data);
                    $(".chosen-select").chosen({width: "100%"});  /* start multiselect */
                    $(".startEmpty").spectrum({allowEmpty:true,showInput:true,preferredFormat: "hex",appendTo:"#modal"}) /*start colorpicker */
                    
                })
                .modal();

        }, "html");

    });



    $('#modal').on('click','.addTemplateInView ',function(e) {
        var field_name = $(this).attr('field-name');
        var template = $('.template').clone();
        $('#addMoreTemplates').append(template.html());
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

        var params = $('form#format-view').serialize();
        console.log(params);

        $.post("/admin/dataset/" + doc_id + "/format-view/" + view,params)
            .done(function(data) {

            })

    })

    $('#modal').on('click','div#templateDiv a.hideTemplate',function(e) {
        e.preventDefault();
        $('#reset').val('');
        $(this).closest('.template').addClass('hidden')
    })
    $('#modal').on('click','div#addMoreTemplates a.removeRow',function(e) {
        console.log("hi")
        e.preventDefault();
        $(this).closest('.row').remove();
    })

        

})


    
       
