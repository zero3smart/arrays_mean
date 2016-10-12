var moment = require("moment");

// Data source format definition
module.exports.DataSource_formats =
{
    CSV: "csv",
    TSV: "tsv"
};


// module.exports.Mismatich_ops =
// {
//     ToField: "ToField", // substitute
//     ToDrop: "ToDrop" // drop if necessory
// };
//
// module.exports.Coercion_optionsPacks = // For convenience
// {
//     ToDate: {
//         FourDigitYearOnly: {
//             format: "YYYY"
//         },
//         ISO_8601: {
//             format: moment.ISO_8601
//         }
//     }
// };
//
//
//
//
var fieldValueDataTypeCoercion_coercionFunctions= function(inString,field) {
    var opName = field.operation;
    if (opName == undefined || opName == 'ProxyExisting' ) {
        return inString;

    } else if (opName == 'ToDate') {

          if (inString == "") { 
            return undefined;
        }
    
        if (inString == "Unknown" || inString == "unknown"
            || inString == "Unkown" || inString == "unkown"
            || inString == "Various" || inString == "various"
            || inString == "N/A" || inString == "n/a") { 
            return undefined;
        }

        if (inString === "0") {
            return null;
        }
        if (inString == "n.d."
            || inString == "n.d"
            || inString == "(n.d.)"
            || inString == "n. d."
            || inString == "no date") { 
            return null;
        }
   
        var dateFormatString = field.format;
        if (dateFormatString == "" || dateFormatString == null || typeof dateFormatString === 'undefined') {
            console.error("❌  No format string with which to derive formatted date \"" + inString + "\". Returning undefined.");
            return undefined;
        }
        // var replacement_parseTwoDigitYear_fn = options.replacement_parseTwoDigitYear_fn;
        // if (replacement_parseTwoDigitYear_fn != null && typeof replacement_parseTwoDigitYear_fn !== 'undefined') {
        //     moment.parseTwoDigitYear = replacement_parseTwoDigitYear_fn;
        // }

        var aMoment = moment.utc(inString, dateFormatString);
        if (aMoment.isValid() == false) {
            console.warn("⚠️  The date \"" + inString + "\" cannot be parsed with the format string \"" + dateFormatString + "\". Returning null.");

            return null;
        }
        return aMoment.toDate();


    } else if (opName == 'ToInteger') {
        return parseInt(inString);


    } else if (opName == 'ToFloat') {
        return parseFloat(inString);

    } else if (opName == 'ToStringTrim') {
        return inString.trim();

    }

}


var fieldValueDataTypeCoercion_revertFunctionsByOperationName =  // Private for now
{ // Note: We're assuming all in-values will be strings, so these are inStrings rather than inValues
    ProxyExisting: function (inString, options) {
        return inString;
    },
    ToStringTrim: function (inString, options) {
        // Trim space characters from either side of string
        return inString.trim();
    },
    ToInteger: function (intValue, options) {
        return intValue.toString();
    },
    ToFloat: function (floatValue, options) {
        return floatValue.toString();
    },
    ToDate: function (date, options) {
        // Now verify date parsing format string
        var dateFormatString = options.format;
        if (dateFormatString == "" || dateFormatString == null || typeof dateFormatString === 'undefined') {
            console.error("❌  No format string with which to derive formatted date \"" + inString + "\". Returning undefined.");

            return undefined;
        }
        if (dateFormatString == moment.ISO_8601)
            dateFormatString = "MMMM Do, YYYY";

        if (isNaN(date.getTime())) {
            // Invalid
            return null;
        } else {
            return moment.utc(date).format(dateFormatString);
        }
    }
};
//
// Public: 
module.exports.NewDataTypeCoercedValue = function (coercionSchemeForKey, rowValue) {
    return fieldValueDataTypeCoercion_coercionFunctions(rowValue,coercionSchemeForKey);
};
// Public:
module.exports.OriginalValue = function (coercionSchemeForKey, rowValue) {
    var operationName = coercionSchemeForKey.do;
    if (operationName == null || operationName == "" || typeof operationName === 'undefined') {
        console.error("❌  Illegal, malformed, or missing operation name at key 'do' in coercion scheme."
            + " Returning undefined.\ncoercionSchemeForKey:\n"
            , coercionSchemeForKey);

        return undefined;
    }
    var operationOptions = coercionSchemeForKey.opts;
    var operationFn = fieldValueDataTypeCoercion_revertFunctionsByOperationName[operationName];
    var coercedValue = operationFn(rowValue, operationOptions);

    return coercedValue;
};