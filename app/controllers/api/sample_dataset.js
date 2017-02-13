var Team = require('../../models/teams');
var datasource_description = require('../../models/descriptions');
var ObjectId = require('mongodb').ObjectID;
var datasource_file_service = require('../../libs/utils/aws-datasource-files-hosting');


function _delegateDatasetDuplication(user, createdTeam, callback) {
    var datasetToDuplicateId = '58a1e9b90f4d7a1976c65010';
    _getSampleDescriptionAndDuplicate(datasetToDuplicateId, user, createdTeam, function (err, duplicatedDoc) {
        if (err) {
            callback(err)
        } else {
            // update the new team with the duplicated dataset
            _updateTeam(duplicatedDoc, createdTeam, function (err, savedTeam) {
                if (err) {
                   res.send({error: err});
                } else {
                    // copy the csv file to new team's aws bucket
                    datasource_file_service.copySampleDatasource(datasetToDuplicateId, duplicatedDoc.id, savedTeam.subdomain, function(err) {
                        if (err) {
                            callback(err);
                        }
                    });
                }
            });
        }
    })
}
module.exports.delegateDatasetDuplication = _delegateDatasetDuplication;

function _getSampleDescriptionAndDuplicate(id, user, createdTeam, callback) {
    datasource_description.findById(id).exec(function (err, dataset) {
        if(err) {
            callback(err, null);
        } else {
            var duplicatedDescription = dataset;
            duplicatedDescription._id = ObjectId();
            // change the associated team
            duplicatedDescription._team = createdTeam._id;
            // change the associated author
            duplicatedDescription.author = user;
            // change dirty to 3
            duplicatedDescription.dirty = 1;
            // flag it as a sample so it can't be published to arrays.co
            duplicatedDescription.sample = true;
            // set to isNew so it saves as a new description in mongodb
            duplicatedDescription.isNew = true;
            duplicatedDescription.save(function (err, savedDescription) {
                if(err) {
                    callback(err, null);
                } else {
                    callback(null, savedDescription)
                }
            });
        }
    });
}

module.exports.getSampleDescriptionAndDuplicate = _getSampleDescriptionAndDuplicate;

function _updateTeam(dataset, createdTeam, callback) {
    createdTeam.datasourceDescriptions.push(dataset.id);
    createdTeam.save(function (err, saved) {
        if(err) {
            callback(err, null)
        } else {
            callback(null, saved)
        }
    })
}

module.exports.updateTeam = _updateTeam;