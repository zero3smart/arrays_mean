/**
 * Scatter plot view factory.
 * @public
 * @constructor
 * @param {scatterplot.chart} chart
 * @param {Integer} [threshold=250]
 */
scatterplot.view.factory = function(chart, threshold) {

    threshold = threshold || 250;

    if (chart._data.length > threshold) {
        return new scatterplot.view.grouped(chart);
    } else {
        return new scatterplot.view.standard(chart);
    }
};