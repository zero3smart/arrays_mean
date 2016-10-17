var teams = require('../../models/teams');
var mongoose_client = require('../../../lib/mongoose_client/mongoose_client');
var _ = require("lodash")

module.exports = {
    GetTeams : function (fn) {
        if (typeof fn == 'function') {
            mongoose_client.WhenMongoDBConnected(function () {
                teams.find({},function(err,teams) {
                    if (err) fn(err);
                    fn(null,teams);

                })
            })


        }
    },

    findOneByTidAndPopulateDatasourceDescription: function(team_key,fn) {

        var obj = null;

      
        teams.findOne({tid: team_key})
        .populate('datasourceDescriptions',null,{fe_visible:true})
        .exec(function(err,teamDesc) {
            if (teamDesc) {
                obj = {team: _.omit(teamDesc,'datasourceDescriptions'),team_dataSourceDescriptions:teamDesc.datasourceDescriptions};
            }
            fn(err,obj);
        })

    }


  







}
