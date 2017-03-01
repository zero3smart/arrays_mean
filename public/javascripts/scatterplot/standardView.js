/**
 * Scatterplot standard view.
 * @public
 * @param {scatterplot.chart} chart
 * @constructor
 */
scatterplot.view.standard = function (chart) {
    /*
     * Call parent class constructor.
     */
    scatterplot.view.main.call(this, chart);
};


scatterplot.view.standard.prototype = Object.create(scatterplot.view.main.prototype);


/**
 * @override
 */
scatterplot.view.standard.prototype.getDensityMatrix = function (data) {
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;

    var xValues = [];
    var yValues = [];

    var densityMatrix = {};

    data.forEach(function (d) {
        xValue = Number(chart._xAccessor(d));
        yValue = Number(chart._yAccessor(d));

        if (!densityMatrix[xValue]) {
            densityMatrix[xValue] = {};
        }

        if (densityMatrix[xValue][yValue]) {
            densityMatrix[xValue][yValue].density++;
        } else {
            d.density = 1;
            densityMatrix[xValue][yValue] = d;
        }
    });

    return densityMatrix;
};


/**
 * @override
 */
scatterplot.view.standard.prototype.render = function (data) {
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;

    var chartData = [];
    var densityMatrix = this.getDensityMatrix(data);

    for (var i in densityMatrix) {
        for (var j in densityMatrix[i]) {
            chartData.push(densityMatrix[i][j]);
        }
    }

    /*
     * Select bubbles.
     */
    var bubbles = chart._canvas.selectAll('circle.bubble')
        .data(chartData.map(function (d) {
            d.radius = chart._radius;
            return d;
        }), function (d) {
            return d.id;
        });
    /*
     * Move existent bubbles.
     */
    bubbles.transition()
        .duration(1000)
        .attr('cx', function (d) {
            return chart._xScale(chart._xAccessor(d));
        }).attr('cy', function (d) {
        return chart._yScale(chart._yAccessor(d));
    }).attr('r', chart._radius);
    /*
     * Render new bubbles.
     */
    bubbles.enter()
        .append('a')
        .attr('xlink:href', function (d, i) {
            /*
             * Create new URI object from current location.
             */
            var uri = URI(location.href);
            /*
             * Object x and y values.
             */
            var x = chart._xAccessor(d);
            var y = chart._yAccessor(d);
            /*
             * Check point density. If density equals to 1 set direct link to the object page.
             * Otherwise set link to set of objects on gallery view.
             */
            if (densityMatrix[x][y].density === 1) {
                uri = uri.segment(2, d.id)
                    .search('');
            } else {
                /*
                 * Prepare filterObj with search params corresponding to that objects set.
                 */
                var filterObj = convertQueryStringToObject(location.search.substring(1));
                /*
                 * Prepare filters with search params corresponding to that objects set.
                 */
                filterObj[chart._xLabel] = JSON.stringify({
                    min: chart._xAccessor(d),
                    max: chart._xAccessor(d) + 1
                });
                filterObj[chart._yLabel] = JSON.stringify({
                    min: chart._yAccessor(d),
                    max: chart._yAccessor(d) + 1
                });
                /*
                 * Generate URL to gallery with prepared filters.
                 */
                uri = uri.segment(2, 'gallery')
                    .search('?' + decodeURIComponent($.param(filterObj)));
            }
            /*
             * Return URL string.
             */
            return uri.href();
        }).append('circle')
        .attr('class', 'bubble')
        .style('opacity', 0.5)
        .style('fill', chart._color)
        .attr('cx', function (d) {
            return chart._xScale(chart._xAccessor.call(undefined, d));
        }).attr('cy', function (d) {
        return chart._yScale(chart._yAccessor.call(undefined, d));
    }).attr('r', 0)
        .on('mouseover', function (d) {
            chart._bubbleMouseOverEventHandler(this, d);
        }).on('mouseout', function (d) {
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
scatterplot.view.standard.prototype.showTooltip = function (bubble, data) {
    /*
     * Stash reference to the chart.
     */
    var chart = this._chart;
    /*
     * Open tooltip's main container.
     */
    var content = '<div class="scatterplot-tooltip-container">';
    /*
     * Append image if there is only one character.
     */
    if (data.density === 1) {
        content += '<div class="scatterplot-tooltip-image" style="background-image:url(' + data[chart._metaData.fe_image.field] + ')"></div>' +
            '<div class="scatterplot-tooltip-title">' + data[chart._metaData.objectTitle] + '</div>';
    }
    /*
     * Open tooltip's text container.
     */
    content += '<div class="scatterplot-tooltip-content">';
    /*
     * If there is more than one character include density information.
     */
    if (data.density > 1) {
        // If data description specifies tooltip terminology it will be displayed, otherwise it will default to  'Records'
        content += '<div>' + data.density + ' ' + (chart._metaData.fe_scatterplot_tooltip_term ? chart._metaData.fe_scatterplot_tooltip_term : 'Records') + ' </div>';
    }
    /*
     * Append common information.
     */
    content += '<div>' +
        chart._xAccessor(data) + ' ' + chart._xLabel.replace('_', ' ') + ', ' +
        chart._yAccessor(data) + ' ' + chart._yLabel.replace('_', ' ') +
        '</div>' +
        '</div>' +
        '</div>';
    /*
     * Set up and show tooltip.
     */
    this._tooltip.setContent(content)
        .setPosition('top')
        .setOffset(chart._radius / 2)
        .show(bubble);
};