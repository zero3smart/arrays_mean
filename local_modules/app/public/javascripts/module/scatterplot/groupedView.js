/**
 * Scatterplot grouped view.
 * @public
 * @param {scatterplot.chart} chart
 * @constructor
 */
scatterplot.view.grouped = function(chart) {
    /*
     * Call parent class constructor.
     */
    scatterplot.view.main.call(this, chart);
}


scatterplot.view.grouped.prototype = Object.create(scatterplot.view.main.prototype);


scatterplot.view.grouped.prototype._prepareData = function(data) {
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;
    /*
     * Get axes ticks.
     */
    var xTicks = chart._xAxis.tickValues();
    var yTicks = chart._yAxis.tickValues();
    /*
     * Generate density matrix filled with values.
     * The matrix rows and columns equals to the chart's rows and columns number.
     */
    this._densityMatrix = xTicks.map(function() {
        return Array.apply(null, Array(yTicks.length)).map(Number.prototype.valueOf,0);
    });
    /*
     * Populate density matrix.
     */
    data.forEach(function(d) {
        /*
         * Get x and y values of the data point.
         */
        var x = Number(chart._xAccessor(d));
        var y = Number(chart._yAccessor(d));
        /*
         * Find corresponding x and y indexes within x and y ticks.
         */
        var xIndex = d3.bisectLeft(xTicks, x);
        var yIndex = yTicks.length - 1 - d3.bisectLeft(yTicks, y);
        /*
         * Increment corresponding element of density matrix.
         */
        this._densityMatrix[xIndex][yIndex] ++;
    }, this);
    /*
     * Create radius scale function.
     */
    var radiusScale = d3.scale.linear()
        .domain([0, 1, data.length])
        .range([0, chart._radius, Math.min(this._chart._innerWidth, this._chart._innerHeight) / 2]);
    /*
     * Return chart actual data.
     */
    return this._densityMatrix.reduce(function(columns, column, i) {
        return columns.concat(column.map(function(density, j) {
            return {
                i : i,
                j : j,
                density : density,
                radius : radiusScale(density)
            };
        }));
    }, []);
};


/**
 * @override
 */
scatterplot.view.grouped.prototype.render = function(data) {
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;
    /*
     * Stash reference to this object.
     */
    var self = this;
    /*
     * Get axes ticks.
     */
    var xTicks = chart._xAxis.tickValues();
    var yTicks = chart._yAxis.tickValues();
    /*
     * Calculate axes intervals width.
     */
    var xStep = chart._innerWidth / xTicks.length;
    var yStep = chart._innerHeight / yTicks.length;
    /*
     * Select bubbles.
     */
    data = this._prepareData(data);
    /*
     * Define chart columns and rows amount.
     */
    var columns = this._densityMatrix.length;
    var rows = this._densityMatrix[0].length;
    /*
     * Select bubbles.
     */
    var bubbles = chart._canvas.selectAll('circle.bubble')
        .data(data);
    /*
     * Move existent bubbles.
     */
    bubbles.transition()
        .duration(1000)
        .attr('cx', function(d) {
            return xStep * d.i + xStep / 2;
        }).attr('cy', function(d) {
            return yStep * d.j + yStep / 2;
        }).attr('r', function(d) {
            return d.radius;
        });
    /*
     * Render new bubbles.
     */
    bubbles.enter()
        .append('circle')
        .attr('class', 'bubble')
        .style('opacity', 0.5)
        .attr('cx', function(d, i) {
            return xStep * d.i + xStep / 2;
        }).attr('cy', function(d, i) {
            return yStep * d.j + yStep / 2;
        }).attr('r', 0)
        .transition()
        .duration(1000)
        .attr('r', function(d) {
            return d.radius;
        }).each('end', function(d, i) {
            d3.select(this).on('mouseover', function(d) {
                chart._bubbleMouseOverEventHandler(this, d);
            }).on('mouseout', function(d) {
                chart._bubbleMouseOutEventHandler(this);
            });
        });
    /*
     * Remove absent bubbles.
     */
    bubbles.exit()
        .transition()
        .duration(1000)
        .attr('r', 0)
        .remove();
};


/**
 * @override
 */
scatterplot.view.grouped.prototype.showTooltip = function(bubble, data) {
    /*
     * Stash reference to the chart.
     */
    var chart = this._chart;
    /*
     * Get axes ticks values.
     */
    var xTicks = chart._xAxis.tickValues();
    var yTicks = chart._yAxis.tickValues();
    /*
     * Evaluate intervals depending on data provided. Remove spaces.
     */
    var xInterval = String(((data.i - 1) in xTicks ? d3.round(xTicks[data.i - 1], 1) : 0) + ' - ' + d3.round(xTicks[data.i], 1))
        .replace(new RegExp(' ', 'g'), '');
    var yInterval = String(((yTicks.length - data.j - 2) in yTicks ? d3.round(yTicks[yTicks.length - data.j - 2], 1) : 0) + ' - ' + d3.round(yTicks[yTicks.length - data.j - 1], 1))
        .replace(new RegExp(' ', 'g'), '');
    /*
     * Show tooltip.
     */
    this._tooltip.setContent(
        '<div class="scatterplot-tooltip-container">' +
            '<div class="scatterplot-tooltip-title">' +
                '<div>X: ' + xInterval + ' ' + chart._xLabel.replace('_', ' ') + '</div>' +
                '<div>Y: ' + yInterval + ' ' + chart._yLabel.replace('_', ' ') + '</div>' +
            '</div>' +
            '<div class="scatterplot-tooltip-content">' + data.density + ' Characters</div>' +
        '</div>')
        .setOffset(chart._radius / 2)
        .show(bubble);

};