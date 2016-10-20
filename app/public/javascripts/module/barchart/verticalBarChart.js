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


VerticalBarChart.prototype._animate = function() {

    var self = this;

    this._bars.attr('width', function(d, i, j) {
            return self.getBarWidth(d, i, j);
        }).attr('x', function(d, i, j) {
            return self.getBarX(d, i, j);
        }).attr('height', 0)
        .attr('y', this._innerHeight);

    this._bars.transition()
        .duration(1000)
        .attr('height', function(d, i, j) {
            return self.getBarHeight(d, i, j);
        }).attr('y', function(d, i, j) {
            return self.getBarY(d, i, j);
        });
};


VerticalBarChart.prototype.getXScale = function() {

    return this._xScale = d3.scale.ordinal()
        .rangeRoundBands([0, this._innerWidth], this._padding)
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