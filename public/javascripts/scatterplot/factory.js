/**
 * Scatter plot view factory.
 * @public
 * @constructor
 * @param {scatterplot.chart} chart
 * @param {Integer} [threshold=250]
 * @param {Object[]} [data]
 */
scatterplot.view.factory = function (chart, threshold, data) {

    threshold = threshold || 250;
    data = data || chart._data;

    if (data.length > threshold) {
        console.log("grouped")
        return new scatterplot.view.grouped(chart);
    } else {
        console.log("standard")
        return new scatterplot.view.standard(chart);
    }
};