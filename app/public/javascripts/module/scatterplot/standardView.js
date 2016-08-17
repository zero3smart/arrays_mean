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
scatterplot.view.standard.prototype.getDensityMatrix = function(data) {
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;

    var xValues = [];
    var yValues = [];

    var densityMatrix = {};

    data.forEach(function(d) {
        xValue = Number(chart._xAccessor(d));
        yValue = Number(chart._yAccessor(d));

        if (! densityMatrix[xValue]) {
            densityMatrix[xValue] = {};
        }

        if (densityMatrix[xValue][yValue]) {
            densityMatrix[xValue][yValue] ++;
        } else {
            densityMatrix[xValue][yValue] = 1;
        }
    });

    return densityMatrix;
}


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
    var densityMatrix = this.getDensityMatrix(data);
    bubbles.enter()
        .append('a')
        .attr('xlink:href', function(d, i) {
            /*
             * Create new URI object from current location.
             */
            var uri = URI(location.href);
            /*
             * Object x and y values.
             */
            var x = chart._xAccessor.call(undefined, d);
            var y = chart._yAccessor.call(undefined, d);
            /*
             * Check point density. If density equals to 1 set direct link to the object page.
             * Otherwise set link to set of objects on gallery view.
             */
            if (densityMatrix[x][y] === 1) {
                var uri = uri.segment(2, d.id)
                    .search('');
            } else {
                /*
                 * Prepare filterJSON with search params corresponding to that objects set.
                 */
                var filterJSON;
                if (uri.search(true).filterJSON) {
                    filterJSON = JSON.parse(uri.search(true).filterJSON);
                } else {
                    filterJSON = {};
                }
                /*
                 * Prepare filterJSON with search params corresponding to that objects set.
                 */
                filterJSON[chart._xLabel] = [{
                    min: chart._xAccessor(d),
                    max: chart._xAccessor(d)
                }];
                filterJSON[chart._yLabel] = [{
                    min: chart._yAccessor(d),
                    max: chart._yAccessor(d)
                }];
                /*
                 * Generate URL to gallery with prepared filterJSON.
                 */
                var uri = uri.segment(2, 'gallery')
                    .search('?filterJSON=' + JSON.stringify(filterJSON));
            }
            /*
             * Return URL string.
             */
            return uri.href();
        }).append('circle')
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
            '<div class="scatterplot-tooltip-image" style="background-image:url(' + data[chart._metaData.fe_designatedFields.medThumbImageURL] + ')"></div>' +
            '<div class="scatterplot-tooltip-title">' + data[chart._metaData.fe_designatedFields.objectTitle] + '</div>' +
            '<div class="scatterplot-tooltip-content">' +
            chart._xAccessor(data) + ' ' + chart._xLabel.replace('_', ' ') + ', ' +
            chart._yAccessor(data) + ' ' + chart._yLabel.replace('_', ' ') +
            '</div>' +
        '</div>')
        .setPosition('top')
        .setOffset(chart._radius / 2)
        .show(bubble);
};