$(document).ready(function () {
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
});