var pageSize = 200;
var timelineGroupSize = 20;
var defaultDateFormat = 'MM/DD/YYYY';

var aggregateByDefaultColumnName = 'Number of Items';


var formatDefaultView = function(view) {
    for (var i = 0; i < view.length; i++) {
        if (view[i] === view[i].toUpperCase()) {
            var replacedUppercase = view[i].toLowerCase();
            var viewHalves = view.split(view[i]);
            viewHalves[1][0] = viewHalves[1][0].toLowerCase();
            return viewHalves.join('-' + replacedUppercase);
        }
    }
}

module.exports = {
    pageSize: pageSize,
    timelineGroupSize: timelineGroupSize,
    defaultDateFormat: defaultDateFormat,
    aggregateByDefaultColumnName: aggregateByDefaultColumnName,
    formatDefaultView: formatDefaultView
};
