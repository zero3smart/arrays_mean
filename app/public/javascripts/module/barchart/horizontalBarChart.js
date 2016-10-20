/**
 * Horizontal bar chart implementation.
 * @param {String} selector
 * @param {Object} dataSet
 * @param {Object} options
 */
function HorizontalBarChart(selector, dataSet, options) {

    BarChart.call(this, selector, dataSet, options);
}


HorizontalBarChart.prototype = Object.create(BarChart.prototype);


HorizontalBarChart.prototype.getXScale = function() {

    return this._xScale = d3.scale.linear()
        .range([0, this._innerWidth])
        .domain([0, this.getMaxValue()]);
};


HorizontalBarChart.prototype.getXAxis = function() {

    return d3.svg.axis()
        .scale(this.getXScale())
        .orient('bottom');
};


HorizontalBarChart.prototype.getXAxisTransform = function() {

    return 'translate(0, ' + this._innerHeight + ')';
};


HorizontalBarChart.prototype.getYScale = function() {

    return this._yScale = d3.scale.ordinal()
        .rangeRoundBands([0, this._innerHeight], 0.05)
        .domain(this._categories);
};


HorizontalBarChart.prototype.getYAxis = function() {

    return d3.svg.axis()
        .scale(this.getYScale())
        .orient('left');
};


HorizontalBarChart.prototype.getYAxisTransform = function() {

    return 'translate(0, 0)';
};


HorizontalBarChart.prototype.getBarHeight = function(d, i, j) {

    return this._yScale.rangeBand();
};


HorizontalBarChart.prototype.getBarWidth = function(d, i, j) {

    return this._xScale(d.value);
};


HorizontalBarChart.prototype.getBarX = function(d, i, j) {

    var x = 0;

    for (var k = 0; k < i; k ++) {
        x += this._xScale(this._data[j][k].value);
    }

    return x;
};


HorizontalBarChart.prototype.getBarY = function(d, i, j) {

    return this._yScale(this._categories[j]);
};