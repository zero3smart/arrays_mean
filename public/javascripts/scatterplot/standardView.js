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
     * Define reference to the chart.
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
            if (densityMatrix[xValue][yValue].hasOwnProperty("Number of Items")) {
                densityMatrix[xValue][yValue].density = d["Number of Items"];
            }
        }
    });

    return densityMatrix;
};


/**
 * @override
 */
scatterplot.view.standard.prototype.render = function (data) {

    var relativeBubbleSize = function(radius, ratio) {
        if (ratio == undefined) {
            var ratio = 1;
        }
        var count = 0;
        while(radius > 100) {
            // first time is fine, then add to the ratio
            radius = radius / ratio;
            count++;
            if (count > 0) {
                ratio += (radius/100);
            }
        } 
        return [ratio, radius]
    }
    /*
     * Definde reference to the chart.
     */
    var chart = this._chart;
    var viewportArea = chart._innerHeight * chart._innerWidth;

    var totalBubbleArea = 0;
    for (var i = 0; i < data.length; i++) {
        var bubbleArea = Math.pow(data[i].radiusBy, 2) * Math.PI;
        totalBubbleArea += bubbleArea;
    }
    var bubbleDividerOrMultiplier = (viewportArea/totalBubbleArea)/(data.length/5);
    // 5 is an arbitrary number but it works for making bubble size small enough without being too small

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
    var ratio;
    var bubbles = chart._canvas.selectAll('circle.bubble')
        .data(chartData.map(function (d) {
            d.radius = Math.sqrt((Math.pow(d.radiusBy, 2) * Math.PI) * bubbleDividerOrMultiplier);
            var relativeSizeRatio = relativeBubbleSize(d.radius, ratio)
            ratio = relativeSizeRatio[0]
            d.radius = relativeSizeRatio[1]
            if (d.radius < 3) {
                d.radius = 3
            };
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
    }).attr('r', function (d) {
        return d.radius;
    });
    /*
     * Render new bubbles.
     */
    bubbles.enter()
        .append('a')
        .attr('xlink:href', function (d, i) {
            /*
             * Create new URI object from current location.
             */
            // var validPortionsOfLocation = window.location.origin + window.location.pathname;
            // var scatterplotLength = "scatterplot".length;
            // var splitAt = validPortionsOfLocation.length - 11;
            // var linkHalf = validPortionsOfLocation.substring(0, splitAt)
            // console.log(linkHalf)
            var uri = new URI(location.href);
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
                var uidSegment = window.location.pathname.replace("scatterplot", "");
                var redirect = window.location.origin + uidSegment + d.id;
                return redirect;
            } else {
                /*
                 * Prepare filterObj with search params corresponding to that objects set.
                 */
                var filterObj = convertQueryStringToObject(location.search.substring(1));
                var invalidFilters = ["xAxis", "yAxis", "aggregateBy"];
                for (var i = 0; i < invalidFilters.length; i++) {
                    if (filterObj.hasOwnProperty(invalidFilters[i])) {
                        delete filterObj[invalidFilters[i]];
                    }
                }
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
                if (chart._galleryView) {
                    uri = uri.segment(1, 'gallery')
                        .search('?' + decodeURIComponent($.param(filterObj)));
                }

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
        .attr('r', function (d) {
            return d.radius;
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
    var hasImage = chart._metaData.fe_image && (chart._metaData.fe_image.field ? true : false)
    if (data.density === 1 && hasImage) {
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