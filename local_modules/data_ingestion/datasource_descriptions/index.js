var fs = require('fs');

exports.GetDescriptions = function() {
    var descriptions = [];
    fs
        .readdirSync(__dirname)
        .forEach(function (file) {
            if (/^\./.test(file)) return;
            if (file == 'index.js' || file == 'default.js') return;

            descriptions = descriptions.concat(require('./' + file).Descriptions);
        });

    return descriptions;
}

exports.GetDescriptionsToSetup = function(files) {
    if (!files || files.length == 0)
        files = require('./default.js').Datasources;

    var descriptions = [];
    files.forEach(function(file){
        descriptions = descriptions.concat(require('./' + file).Descriptions);
    });

    return descriptions;
}