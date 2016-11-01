$(document).ready(function () {


  

    $('#add_urls').on('click',function(e) {
        $('form#settings #extra_urls').append("<div class='form-group row'><input class='col-xs-8 col-xs-offset-4 urls' name='urls[]' type='text' value=''></div>");
    })

    $('#file').on('change', function (e) {
        const files = $('#file')[0].files;
        const file = files[0];
        if (file == null) {
            return alert('No file selected');
        }
        $('.upload button').removeAttr('disabled');
    });

    $('.format-data tr.field').on('click', function(e) {
        e.preventDefault();

        var field_name = $(this).attr('data-field-name');
        var doc_id = $('#doc_id').val();

        $.get("/admin/dataset/" + doc_id + "/format-field/" + field_name, null, function (data) {



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
                    $('.multiselect').multiselect(
                        {buttonClass: 'form-control'}
                                            
                    )


                })
                .modal();

        }, "html");



    });

    $('#addCustomField').on('click', function(e) {
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

    $('#modal').on('click', '#format-field-done', function(e) {
        var doc_id = $('#doc_id').val();
        var field = $('#name').val();

        var params = $('form.format-field').serialize();
        // TODO: Consider to ask for user to login since of expiration

        $.post("/admin/dataset/" + doc_id + "/format-field/" + field, params)
            .done(function(data) {


            // TODO: Update the column on the parent table
            $('#changed').val(true);
            $('#modal').modal('hide');
        }, 'json');
    })


    $('#modal').on('click','a#add_valuesToExcludeByOriginalKey',function(e) {
         $('#extra_valuesToExcludeByOriginalKey').append("<div class='form-group row'><input class='col-xs-2 col-xs-offset-1' name='valuesToExcludeByOriginalKey[]' type='text' value=''></div>");
    })






});