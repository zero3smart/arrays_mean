/**
 * Vertical bar chart implementation.
 * @param {String} selector
 * @param {Object} dataSet
 * @param {Object} options
 */
function VerticalBarChart(selector, dataSet, options) {

    BarChart.call(this, selector, dataSet, options);
}


VerticalBarChart.prototype = Object.create(BarChart.prototype);


VerticalBarChart.prototype.getXScale = function() {

    return this._xScale = d3.scale.ordinal()
        .rangeRoundBands([0, this._innerWidth], 0.05)
        .domain(this._categories);
};


VerticalBarChart.prototype.getXAxis = function() {

    return d3.svg.axis()
        .scale(this.getXScale())
        .orient('bottom');
};


VerticalBarChart.prototype.getXAxisTransform = function() {

    return 'translate(0, ' + this._innerHeight + ')';
};


VerticalBarChart.prototype.getYScale = function() {

    return this._yScale = d3.scale.linear()
        .range([this._innerHeight, 0])
        .domain([0, this.getMaxValue()]);
};


VerticalBarChart.prototype.getYAxis = function() {

    return d3.svg.axis()
        .scale(this.getYScale())
        .orient('left');
};


VerticalBarChart.prototype.getYAxisTransform = function() {

    return 'translate(0, 0)';
};


VerticalBarChart.prototype.getBarHeight = function(d, i, j) {

    return this._innerHeight - this._yScale(d.value);
};


VerticalBarChart.prototype.getBarWidth = function(d, i, j) {

    return this._xScale.rangeBand();
};


VerticalBarChart.prototype.getBarX = function(d, i, j) {

    return this._xScale(this._categories[j]);
};


VerticalBarChart.prototype.getBarY = function(d, i, j) {

    var y = 0;

    for (var k = 0; k <= i; k ++) {
        y += this._innerHeight - this._yScale(this._data[j][k].value);
    }

    return this._innerHeight - y;
};