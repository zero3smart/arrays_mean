const async = require('async');
const winston = require('winston');
//
const mongoose_client = require('../mongoose_client/mongoose_client');
//
//
////////////////////////////////////////////////////////////////////////////////
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
    // console.info("💬  Questions Controller initialized")
};
//
//
//
// Public - Imperatives - 
//