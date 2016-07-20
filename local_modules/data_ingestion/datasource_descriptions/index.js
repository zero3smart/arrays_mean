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

exports.GetDescriptionsToSetup = function(datasources) {
    if (!datasources || datasources.length == 0)
        datasources = require('./default.js').Datasources;

    var descriptions = [];
    datasources.forEach(function(datasource){
        if (typeof datasource === 'string') {
            descriptions = descriptions.concat(require('./' + datasource).Descriptions);

        } else if (datasource && datasource.file != null) {

            var descs = require('./' + datasource.file).Descriptions;
            descs.forEach(function(desc){
                desc.importFormat = datasource.importFormat;
                descriptions.push(desc);
            });
        }
    });

    return descriptions;
}