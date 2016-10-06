$(document).ready(function() {
     /* $('#url').on('change', function() {
        var url = $('#url').val();
        if (url != '') {
            var xhr = new XMLHttpRequest();

            // "withCredentials" only exists on XMLHTMLRequest2 objects
            if ("withCredentials" in xhr) {
                xhr.open('HEAD', url, true)
            } else if (typeof XDomainRequest != "undefined") {
                // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
                xhr = new XDomainRequest();
                xhr.open('HEAD', url);
            } else {
                // Otherwise, CORS is not supported by the browser
                xhr = null;
            }

            if (!xhr) {
                return console.log('CORS not supported');
            }

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status == 404) {
                        console.log('File Existence - Failed');
                        alert('The URL is invalid');
                        $('#url').val('');
                    }
                }
            }
            xhr.send();
        }
    }); */

    $('#file-input').on('change', function() {
        const files = $('#file-input')[0].files;
        const file = files[0];
        if (file == null) {
            return alert('No file selected');
        }
        getSignedRequest(file);
        $('input[type="submit"]').attr('disabled', 'disabled');
    });

    function getSignedRequest(file) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', "/admin/dataset/sign-s3?file-name=" + encodeURIComponent(file.name) + "&file-type=" + file.type);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    uploadFile(file, response.signedRequest, response.url);
                } else {
                    alert('Could not get signed URL.');
                }
            }
        };
        xhr.send();
    }

    function uploadFile(file, signedRequest, url) {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedRequest);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    $('#url').val(url);
                } else {
                    alert('Could not upload file.');
                }
                $('input[type="submit"]').removeAttr('disabled');
            }
        };
        xhr.send(file);
    }
});