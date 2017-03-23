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

module.exports.displayNumberWithComma = function(number) {
    if (typeof number !== 'object') {
         var parts = number.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }
   return number;
}


var fieldValueDataTypeCoercion_coercionFunctions = function (inString, field, name) {

     if (inString.toLowerCase() == 'null') {
        return null;
    }


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
        if (dateFormatString === 'ISO_8601') {
            dateFormatString = moment.ISO_8601;
        }

        if (moment.utc(inString, dateFormatString, true).isValid()) {
            var aMoment = moment.utc(inString, dateFormatString);
        } else {
            var knownDateResult = _isDate(inString);
            var edgeDateResult = _isEdgeDate(inString);
            var ISODateResult = _isISODateOrString(inString);
            switch (true) {
                case knownDateResult[0]:
                    dateFormatString = knownDateResult[1];
                    break;
                case edgeDateResult[0]:
                    dateFormatString = edgeDateResult[1];
                    break;
                case ISODateResult[0]: 
                    dateFormatString = ISODateResult[1];
                    break;
                default:
                    console.log("none of the above");
                    return undefined;
            }
            var aMoment = moment.utc(inString, dateFormatString);
        }

        if (aMoment.isValid() == false) {
            console.warn("⚠️  The date \"" + inString + "\" cannot be parsed with the format string \"" + dateFormatString + "\". Returning null.");

            return null;
        }
        return aMoment.toDate();


    } else if (opName == 'ToInteger') {
        var commaRE = /,/g
        inString = inString.replace(commaRE,'');
        if (!isNaN(parseInt(inString)))
            return parseInt(inString);
        return 0;

    } else if (opName == 'ToFloat') {
        var commaRE = /,/g
        inString = inString.replace(commaRE, '');
        if (!isNaN(parseFloat(inString)));
            return parseFloat(inString);
        return 0;

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

        if (date == null || isNaN(date.getTime())) {
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
module.exports.NewDataTypeCoercedValue = function (coercionSchemeForKey, rowValue, columnName) {
    var operationName = coercionSchemeForKey.operation;
    if (operationName == null || operationName == "" || typeof operationName === 'undefined') {
        console.error("❌  Illegal, malformed, or missing operation name at key 'operation' in coercion scheme."
            + " Returning undefined.\ncoercionSchemeForKey:\n"
            , coercionSchemeForKey);

        return undefined;
    }


    return fieldValueDataTypeCoercion_coercionFunctions(rowValue, coercionSchemeForKey, columnName);
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
};

module.exports.doesExistFormat_fieldDataType_coercion_toString = function(field) {
    if (!field) return false;

    var opName = field.operation;
    if (opName == 'ToDate') {
        return true;
    }

    return false;
};

module.exports.available_forFieldDataType_coercions = function() {
    return [
        {operation: 'ToString'},
        // {operation: 'ProxyExisting'},
        {operation: 'ToDate', format: 'YYYY/MM/DD', outputFormat: 'MMMM Do, YYYY'},
        {operation: 'ToInteger'},
        {operation: 'ToFloat'},
        // {operation: 'ToStringTrim'}
        ];
};

module.exports.available_forDuration = function() {
    return ["Decade", "Year", "Month", "Day"]
};

var _isDate = function(sample) {
    var known_date_formats = ['MM/DD/YYYY', 'M/D/YYYY', 'M/DD/YYYY', 'MM/D/YYYY', 'MM/DD/YY HH:mm', 'M/DD/YY HH:mm', 'M/D/YY HH:mm', 'MM/DD/YY H:mm', 'M/DD/YY H:mm', 'M/D/YY H:mm', 'M/D/YY', 'MM/DD/YY', 'MM/D/YY', 'M/DD/YY', 'M/DD/YY', 'YYYY/MM/DD', 'YYYY/M/D', 'YYYY/MM/D', 'YYYY/M/DD', 'YY/MM/DD', 'YY/M/D', 'YY/MM/D', 'YY/M/DD', 'MM-DD-YYYY', 'M-D-YYYY', 'MM-D-YYYY', 'MM-DD-YYYY', 'M-D-YY', 'MM-DD-YY', 'M-DD-YY', 'MM-D-YY', 'MM-YYYY', 'YYYY-MM-DD', 'YYYY-M-D', 'YYYY-MM-D', 'YYYY-M-DD', 'YYYY/MM', 'YYYY/M', 'YY/MM', 'YY/M'];
    for(var i = 0; i < known_date_formats.length; i++) {
        if (moment(sample, known_date_formats[i], true).isValid()) {
            return [true, known_date_formats[i]];
        } 
    }
    return [false, null];
};
module.exports.isDate = _isDate;

// AKA. Dates that could be easily confused for an int
var _isEdgeDate = function(sample) {
    if (moment(sample, 'YYYY', true).isValid()) {
        return [true, 'YYYY'];
    } else if (moment(sample, 'YYYYMMDD', true).isValid()) {
        return [true, 'YYYYMMDD'];
    } else if (moment(sample, moment.ISO_8601, true).isValid()) {
        return [true, 'ISO_8601'];
    } else {
        return [false, null];
    }
};
module.exports.isEdgeDate = _isEdgeDate;

var _isISODateOrString = function(sample) {
    if (moment(sample, moment.ISO_8601, true).isValid()) {
        return [true, "ISO_8601"];
    }
    return [false, null];
};
module.exports.isISODateOrString = _isISODateOrString;

var _isValidFormat = function(format) {
    var separatorRE = /(\s|-|\/)/;
        if (!separatorRE.test(format) && format.length > 4) {
            return false;
        }
        return true;
};
module.exports.isValidFormat = _isValidFormat;

var _makeFormatValid = function(format) {
    var formatRE = /(Y+)(M+)(D+)/;
    return format.split(formatRE).filter(Boolean).join('-');

}
module.exports.makeFormatValid = _makeFormatValid;

var _verifyDataType = function(name, sample, rowObjects, index) {
    var numberRE = /([^0-9\.,-]|\s)/;
    var rowObject = rowObjects[index]
    if(rowObject.operation == "ToDate" && !moment(sample, rowObject.input_format, true).isValid()) {
        var secondRowObject = intuitDatatype(name, sample);
        rowObject.data_type = secondRowObject.data_type;
        rowObject.operation = secondRowObject.operation;

    } else if((rowObject.operation == "ToInteger" || rowObject.operation == "ToFloat") && numberRE.test(sample)) {
        var secondRowObject = intuitDatatype(name, sample);
        rowObject.data_type = secondRowObject.data_type;
        rowObject.operation = secondRowObject.operation;
    }
    return rowObject;
};
module.exports.verifyDataType = _verifyDataType;

var _intuitDatatype = function(name, sample) {
    var format = _isDate(sample)[1];
    if (format !== null) {
        return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: format, operation: 'ToDate'};
    }

    var dateRE = /(year|DATE)/i;
    if (dateRE.test(name)) {
        format = _isEdgeDate(sample)[1];
        if (format === 'ISO_8601') {
            return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: 'YYYY-MM-DD', operation: 'ToDate'};
        } else if (format !== null) {

            if (_isValidFormat(format)) {
                return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: format, operation: 'ToDate'};
            } else {
                var valid_format = _makeFormatValid(format);
                return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: valid_format, operation: 'ToDate'};
            }

        } else {
            return {name: name, sample: sample, data_type: 'Text', operation: 'ToString'};
        }
    }

    // if the sample has anything other than numbers and a "." or a "," then it's most likely a string
    var numberRE = /([^0-9\.,-]|\s)/;
    var floatRE = /[^0-9,-]/;
    var IdRE = /(Id|ID)/;
    if(numberRE.test(sample) || IdRE.test(name) || sample === "") {
        // if it's definitely not a number, double check to see if it's a valid ISO 8601 date
        format = _isISODateOrString(sample)[1];
        if(format !== null) {
            return {name: name, sample: sample, data_type: 'Date', input_format: format, output_format: 'YYYY-MM-DD', operation: 'ToDate'};
        }
    } else if(floatRE.test(sample)) {
        var numberWithoutComma = sample.replace(",", "");
        if (!isNaN(Number(numberWithoutComma))) {
            return {name: name, sample: sample, data_type: 'Number', operation: 'ToFloat'};
        }
    } else {
        var numberWithoutComma = sample.replace(",", "");
        if (!isNaN(Number(numberWithoutComma))) {
            return {name: name, sample: sample, data_type: 'Number', operation: 'ToInteger'};
        }
    }
    return {name: name, sample: sample, data_type: 'Text', operation: 'ToString'};
};
module.exports.intuitDatatype = _intuitDatatype