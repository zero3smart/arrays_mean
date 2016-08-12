var fs = require('fs');

exports.GetDescriptions = function() {
    var descriptions = [];
    fs
        .readdirSync(__dirname)
        .forEach(function (file) {
            if (/^\./.test(file)) return;
            if (file == 'index.js' || file == 'default.js') return;

            require('./' + file).Descriptions.forEach(function(desc) {
                if (desc.schemaname == null) {
                    descriptions.push(desc);
                }
            });
        });

    return descriptions;
}

exports.GetDescriptionsToSetup = function(files) {
    if (!files || files.length == 0)
        files = require('./default.js').Datasources;

    var descriptions = [];
    files.forEach(function(file){
        var descs = require('./' + file).Descriptions;
        var newDescs = [];
        descs.forEach(function(desc){
            // Extract the common fields from the schema if available.
            if (desc.schemaname) {
                var schemaDescriptions = require('./' + desc.schemaname).Descriptions;
                var schemaDesc = Array.isArray(schemaDescriptions) ? schemaDescriptions[0] : schemaDescriptions;

                for (var attrname in schemaDesc) {
                    if (desc[attrname]) {
                        if (Array.isArray(desc[attrname])) {
                            desc[attrname] = schemaDesc[attrname].concat(desc[attrname]);
                        } else if (typeof desc[attrname] === 'string') {
                            // Nothing to do
                        } else if (typeof desc[attrname] === 'object') {
                            desc[attrname] = mergeObject(schemaDesc[attrname], desc[attrname]);
                        }
                    } else {
                        desc[attrname] = schemaDesc[attrname];
                    }
                }
            }
            newDescs.push(desc);
        });
        descriptions = descriptions.concat(newDescs);
    });

    return descriptions;
}

function mergeObject(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}