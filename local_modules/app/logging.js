'use strict';

var winston = require('winston');
var expressWinston = require('express-winston');

module.exports = function(options, context) 
{
    var self = this
    self.options = options
    self.context = context
    //
    var colorize = process.env.NODE_ENV === 'production' ? false : true;
    //
    var requestLogger = expressWinston.logger({
        transports: [
            new winston.transports.Console({
                json: false,
                colorize: colorize
            })
        ],
        expressFormat: true,
        meta: false
    })
    //
    var errorLogger = expressWinston.errorLogger({
        transports: [
            new winston.transports.Console({
                json: true,
                colorize: colorize
            }),
        ]
    })
    //
    return {
        requestLogger: requestLogger,
        errorLogger: errorLogger,
        error: winston.error,
        warn: winston.warn,
        info: winston.info,
        log: winston.log,
        verbose: winston.verbose,
        debug: winston.debug,
        silly: winston.silly
    }
}