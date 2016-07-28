/**
 * Scatterplot standard view.
 * @public
 * @param {scatterplot.chart} chart
 * @constructor
 */
scatterplot.view.standard = function(chart) {
    /*
     * Call parent class constructor.
     */
    scatterplot.view.main.call(this, chart);
}


scatterplot.view.standard.prototype = Object.create(scatterplot.view.main.prototype);


/**
 * @override
 */
scatterplot.view.standard.prototype.render = function(data) {
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;
    /*
     * Select bubbles.
     */
    var bubbles = chart._canvas.selectAll('circle.bubble')
        .data(data.map(function(d) {
            d.radius = chart._radius;
            return d;
        }), function(d) {
            return d.id;
        });
    /*
     * Move existent bubbles.
     */
    bubbles.transition()
        .duration(1000)
        .attr('cx', function(d) {
            return chart._xScale(chart._xAccessor.call(undefined, d))
        }).attr('cy', function(d) {
            return chart._yScale(chart._yAccessor.call(undefined, d))
        }).attr('r', chart._radius);
    /*
     * Render new bubbles.
     */
    bubbles.enter()
        .append('circle')
        .attr('class', 'bubble')
        .style('opacity', 0.5)
        .style('fill', chart._color)
        .attr('cx', function(d) {
            return chart._xScale(chart._xAccessor.call(undefined, d))
        }).attr('cy', function(d) {
            return chart._yScale(chart._yAccessor.call(undefined, d))
        }).attr('r', 0)
        .on('mouseover', function(d) {
            chart._bubbleMouseOverEventHandler(this, d);
        }).on('mouseout', function(d) {
            chart._bubbleMouseOutEventHandler(this);
        }).transition()
        .duration(1000)
        .attr('r', chart._radius);
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
scatterplot.view.standard.prototype.showTooltip = function(bubble, data) {

    var chart = this._chart;

    this._tooltip.setContent(
        '<div class="scatterplot-tooltip-container">' +
            '<div class="scatterplot-tooltip-image" style="background-image:url(' + data.thumb_small + ')"></div>' +
            '<div class="scatterplot-tooltip-title">' + data.name + '</div>' +
            '<div class="scatterplot-tooltip-content">' +
            chart._xAccessor(data) + ' ' + chart._xLabel.replace('_', ' ') + ', ' +
            chart._yAccessor(data) + ' ' + chart._yLabel.replace('_', ' ') +
            '</div>' +
        '</div>')
        .setPosition('top')
        .setOffset(chart._radius / 2)
        .show(bubble);
};