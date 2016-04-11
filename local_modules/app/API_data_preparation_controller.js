//
//
// Imports
//
var winston = require('winston');

//
//
// Controller Implementation
//
var constructor = function(options, context)
{
    var self = this;
    self.options = options;
    self.context = context;
    //
    self._init();
    //
    return self;
};
module.exports = constructor;
constructor.prototype._init = function()
{
    var self = this;
    // console.log('API data preparation controller is up');
};
//
//
// Controller - Accessors
//
constructor.prototype.DataFor_ExploreDatasets = function(callback)
{
    var self = this;
    var data = {};
    
    callback(data);
};
