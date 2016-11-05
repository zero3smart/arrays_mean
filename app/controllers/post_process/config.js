var pageSize = 200;
var timelineGroupSize = 20;
var timelineGroups = pageSize / timelineGroupSize * 2;
var defaultDateFormat = "MMMM Do, YYYY";

var aggregateByDefaultColumnName = "Number of Records";

module.exports = {
    pageSize: pageSize,
    timelineGroupSize: timelineGroupSize,
    timelineGroups: timelineGroups,
    defaultDateFormat: defaultDateFormat,
    aggregateByDefaultColumnName: aggregateByDefaultColumnName
}