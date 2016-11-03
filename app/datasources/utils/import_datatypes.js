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

//
//
var fieldValueDataTypeCoercion_coercionFunctions = function (inString, field) {
    var opName = field.operation;
    if (opName == 'ProxyExisting') {
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

    } else {
        return inString;
    }

}

var fieldValueDataTypeCoercion_revertFunctions = function (value, field) {
    var opName = field.operation;
    if (opName == "ProxyExisting") {
        return value;
    } else if (opName == "ToStringTrim") {
        return value.trim();
    } else if (opName == "ToInteger" || opName == "ToFloat") {
        return value.toString();
    } else if (opName == "ToDate") {
        var date = value;
        var dateFormatString = field.format;
        if (dateFormatString == "" || dateFormatString == null || typeof dateFormatString === 'undefined') {
            console.error("❌  No format string with which to derive formatted date \"" + inString + "\". Returning undefined.");
            return undefined;
        }
        if (dateFormatString == "ISO_8601")
            dateFormatString = "MMMM Do, YYYY";

        if (isNaN(date.getTime())) {
            // Invalid
            return null;
        } else {
            return moment.utc(date).format(dateFormatString);
        }
    } else {
        return value;
    }


}
//
// Public: 
module.exports.NewDataTypeCoercedValue = function (coercionSchemeForKey, rowValue) {
    var operationName = coercionSchemeForKey.operation;
    if (operationName == null || operationName == "" || typeof operationName === 'undefined') {
        console.error("❌  Illegal, malformed, or missing operation name at key 'operation' in coercion scheme."
            + " Returning undefined.\ncoercionSchemeForKey:\n"
            , coercionSchemeForKey);

        return undefined;
    }


    return fieldValueDataTypeCoercion_coercionFunctions(rowValue, coercionSchemeForKey);
};
// Public:
module.exports.OriginalValue = function (coercionSchemeForKey, rowValue) {
    var operationName = coercionSchemeForKey.operation;
    if (operationName == null || operationName == "" || typeof operationName === 'undefined') {
        console.error("❌  Illegal, malformed, or missing operation name at key 'operation' in coercion scheme."
            + " Returning undefined.\ncoercionSchemeForKey:\n"
            , coercionSchemeForKey);

        return undefined;
    }

    return fieldValueDataTypeCoercion_revertFunctions(rowValue, coercionSchemeForKey);

};

module.exports.fieldDataType_coercion_toString = function(field) {
    if (!field) return 'String';

    var opName = field.operation;
    if (opName == 'ProxyExisting') {
        return 'Proxy';
    } else if (opName == 'ToDate') {
        return 'Date';
    } else if (opName == 'ToInteger') {
        return 'Integer';
    } else if (opName == 'ToFloat') {
        return 'Float';
    } else if (opName == 'ToStringTrim') {
        return 'String Trim';
    } else {
        return 'String'; // 'Unknown'
    }
}

module.exports.doesExistFormat_fieldDataType_coercion_toString = function(field) {
    if (!field) return false;

    var opName = field.operation;
    if (opName == 'ToDate') {
        return true;
    }

    return false;
}

module.exports.available_forFieldDataType_coercions = function() {
    return [
        {operation: 'ToString'},
        {operation: 'ProxyExisting'},
        {operation: 'ToDate', format: 'YYYY/MM/DD', outputFormat: 'MMMM Do, YYYY'},
        {operation: 'ToInteger'},
        {operation: 'ToFloat'},
        {operation: 'ToStringTrim'}
        ];
}



module.exports.available_forDuration = function() {
    return ["Decade", "Year", "Month", "Day"]
}