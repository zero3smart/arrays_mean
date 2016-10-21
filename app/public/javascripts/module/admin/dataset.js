$(document).ready(function () {
    $('#file').on('change', function () {
        const files = $('#file')[0].files;
        const file = files[0];
        if (file == null) {
            return alert('No file selected');
        }
        $('.upload button').removeAttr('disabled');
    });
});