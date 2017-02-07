var pageSize = 200;
var timelineGroupSize = 20;
var timelineGroups = pageSize / timelineGroupSize * 2;
var defaultDateFormat = "MM/DD/YYYY";

var aggregateByDefaultColumnName = "Number of Items";

module.exports = {
    pageSize: pageSize,
    timelineGroupSize: timelineGroupSize,
    timelineGroups: timelineGroups,
    defaultDateFormat: defaultDateFormat,
    aggregateByDefaultColumnName: aggregateByDefaultColumnName
}