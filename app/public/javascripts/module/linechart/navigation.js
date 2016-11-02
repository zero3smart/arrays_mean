/**
 * @constructor
 * @param {Object{data, labels, colors}} data
 * @param {linechart.viewport}
 */
linechart.navigation = function (data, viewport) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data.data.map(function (lineData) {
        return lineData.map(function (d) {
            d.date = new Date(d.date);
            return d;
        })
    });

    /**
     * Time series names.
     * @private
     * @member {String[]}
     */
    this._labels = data.labels;

    /**
     * Chart to upadte.
     * @private
     * @member {linechart.viewport}
     */
    this._viewport = viewport;
    /**
     * Chart container.
     * @private
     * @member {Selection}
     */
    this._container = undefined;
    /**
     * Chart canvas width.
     * @private
     * @member {Number}
     */
    this._innerWitdh = undefined;
    /**
     * Chart canvas height.
     * @private
     * @member {Number}
     */
    this._innerHeight = undefined;
    /**
     * Chart SVG width.
     * @private
     * @member {Number}
     */
    this._outerWitdh = undefined;
    /**
     * Chart SVG height.
     * @private
     * @member {Number}
     */
    this._outerHeight = undefined;
    /**
     * Chart SVG element.
     * @private
     * @member {Selection}
     */
    this._svg = undefined;
    /**
     * Chart main g element.
     * @private
     * @member {Selection}
     */
    this._canvas = undefined;
    /**
     * Chart x scale function.
     * @private
     * @member {Function}
     */
    this._xScale = d3.time.scale();
    /**
     * Chart y scale function.
     * @private
     * @member {Function}
     */
    this._yScale = d3.scale.linear();
    /**
     * Custom date format in X axis
     */
    this._customTimeFormat = d3.time.format.multi([
        [".%L", function (d) {
            return d.getMilliseconds();
        }],
        [":%S", function (d) {
            return d.getSeconds();
        }],
        ["%I:%M", function (d) {
            return d.getMinutes();
        }],
        ["%I %p", function (d) {
            return d.getHours();
        }],
        ["%a %d", function (d) {
            return d.getDay() && d.getDate() != 1;
        }],
        ["%b %d", function (d) {
            return d.getDate() != 1;
        }],
        ["%B", function (d) {
            return d.getMonth();
        }],
        ["'%y", function () {
            return true;
        }]
    ]);
    /**
     * Chart x axis.
     * @private
     * @member {Function}
     */
    this._xAxis = d3.svg.axis()
        .scale(this._xScale)
        .orient('bottom')
        .tickFormat(this._customTimeFormat);
    /**
     * Chart x axis container.
     * @private
     * @member {Selection}
     */
    this._xAxisContainer = undefined;
    /**
     * Lines color set.
     * @private
     * @member {String[]}
     */
    this._colors = d3.scale.category10().range();
    if (data.colors) {
        for (var i = 0; i < data.colors.length; i++) {
            this._colors[i] = data.colors[i];
        }
    }
    /*
     * Stash reference to this object.
     */
    var self = this;
    /**
     * Line generator.
     * @private
     * @member {Function}
     */
    this._lineGenerator = d3.svg.line()
        .x(function (d) {
            return self._xScale(d.date);
        }).y(function (d) {
            return self._yScale(d.value);
        });
    /**
     * X axis height.
     * @private
     * @member {Integer}
     */
    this._xAxisHeight = 20;
    /**
     * d3.js brush.
     * @private
     * @member {Function}
     */
    this._brush = d3.svg.brush()
        .x(self._xScale)
        .on('brush', function () {
            self._brushEventHandler();
        });
    /**
     * Brush handle radius.
     * @private
     * @member {Integer}
     */
    this._brushHandleRadius = 7;
    /**
     * Chart margins.
     * @private
     * @member {Object}
     */
    this._margin = {
        top: 25,
        right: 15,
        bottom: 30,
        left: this._brushHandleRadius
    };
};


linechart.navigation.prototype = Object.create(linechart.base.prototype);


/**
 * Brush event handler.
 * @private
 * @returns
 */
linechart.navigation.prototype._brushEventHandler = function () {
    /*
     * Restore viewport if brush empty.
     */
    if (this._brush.empty()) {
        this._resetBrush();
        return this._viewport.update(this._data);
    }
    /*
     * Get brush extent and put them into separate variables.
     */
    var extent = this._brush.extent();
    var min = extent[0];
    var max = extent[1];
    /*
     * Filter data depending on extent.
     */
    var data = this._data.map(function (series) {
        return series.filter(function (d) {
            if (d.date >= min && d.date <= max) {
                return true;
            }
        });
    });
    /*
     * Define brush height.
     */
    var brushHeight = this._innerHeight + this._xAxisHeight;
    /*
     * Update brush side panels sizes.
     */
    this._leftSide.attr('x', 1)
        .attr('width', this._xScale(min));
    if (this._xScale.range()[1] > this._xScale(max) + 1)
        this._rightSide.attr('x', this._xScale(max))
            .attr('width', this._xScale.range()[1] - this._xScale(max) - 1);
    /*
     * Update viewport.
     */
    this._viewport.update(data);
};


/**
 * Render chart.
 * @public
 * @param {String} selector
 * @returns {linechart.navigation}
 */
linechart.navigation.prototype.render = function (container) {
    /*
     * Select chart container.
     */
    this._container = container;
    /*
     * Check container is founded by provided selector.
     */
    if (this._container.size() === 0) {
        throw new Error('Cannot find HTML element by "' + selector + '" selector');
    }
    /*
     * Append SVG element.
     */
    this._svg = this._container.append('svg')
        .attr('class', 'navigation');
    /*
     * Append chart canvas.
     */
    this._canvas = this._svg.append('g')
        .attr('transform', 'translate(' + this._margin.left + ', ' + this._margin.top + ')');
    /*
     * Append x axis container.
     */
    this._xAxisContainer = this._canvas.append('g')
        .attr('class', 'axis x-axis');
    /*
     * Render empty lines.
     */
    this._line = this._canvas.selectAll('path.line')
        .data(this._data)
        .enter()
        .append('path')
        .attr('class', 'line');
    /*
     * Append brush container.
     */
    var brushContainer = this._canvas.append('g');
    /*
     * Append brush side panels.
     */
    this._leftSide = brushContainer.append('rect')
        .attr('class', 'brush-background')
        .attr('y', 0);
    this._rightSide = brushContainer.append('rect')
        .attr('class', 'brush-background')
        .attr('y', 0);
    /*
     * Append brush.
     */
    this._brushContainer = brushContainer.append('g')
        .attr('class', 'x brush')
        .call(this._brush);
    /*
     * Render brush handles.
     */
    this._brushContainer.selectAll('.resize')
        .append('rect')
        .attr('class', 'handle')
        .attr('x', -1)
        .attr('y', 0)
        .attr('width', 2);
    this._brushContainer.selectAll('.resize')
        .append('circle')
        .attr('class', 'handle')
        .attr('r', this._brushHandleRadius);
    /*
     * Append x axis bottom border line.
     */
    this._xAxisBorder = this._xAxisContainer.append('line')
        .attr('y1', this._xAxisHeight)
        .attr('y2', this._xAxisHeight);
    /*
     * Set up chart dimension.
     */
    this.resize();

    return this;
};


/**
 * Resize chart.
 * @public
 * @returns {linechart.navigation}
 */
linechart.navigation.prototype.resize = function () {
    /*
     * Get brush extent before we redraw charts.
     */
    var extent = this._brush.extent();
    /*
     * Get container dimensions.
     */
    var dimension = this._container.node().getBoundingClientRect();
    /*
     * Set up chart outer and inner width and height.
     */
    this._outerWidth = dimension.width;
    this._innerWidth = this._outerWidth - this._margin.left - this._margin.right;
    this._outerHeight = dimension.height;
    this._innerHeight = this._outerHeight - this._margin.top - this._margin.bottom;
    /*
     * Recalculate inner width and shift canvas again.
     * This is necessary if in code above (mobile check) was changes.
     */
    this._canvas.attr('transform', 'translate(' + this._margin.left + ', ' + this._margin.top + ')');
    this._innerWidth = this._outerWidth - this._margin.left - this._margin.right;
    /*
     * Configure scale functions.
     */
    this._xScale.range([0, this._innerWidth]);
    this._yScale.range([this._innerHeight, 0]);
    /*
     * Append SVG element.
     */
    this._svg.attr('width', this._outerWidth)
        .attr('height', this._outerHeight);
    /*
     * Update grid.
     */
    this._xAxis.tickSize(-this._innerHeight, 0);
    /*
     * Move x axis corresponding with chart height.
     */
    this._xAxisContainer.attr('transform', 'translate(0, ' + this._innerHeight + ')');
    /*
     * Extent x axis ticks down.
     */
    this._xAxisContainer.selectAll('line')
        .attr('y1', this._xAxisHeight);
    /*
     * Resize brush.
     */
    this._brushContainer.call(this._brush);
    this._brushContainer.selectAll('rect')
        .attr('height', this._innerHeight + this._xAxisHeight);
    this._brushContainer.selectAll('rect.handle')
        .attr('height', this._innerHeight + this._xAxisHeight);
    /*
     * Move handles.
     */
    this._brushContainer.selectAll('circle.handle')
        .attr('cy', this._innerHeight + this._xAxisHeight);
    /*
     * Change rectangled handle height.
     */
    this._brushContainer.selectAll('.resize rect')
        .attr('height', this._innerHeight + this._xAxisHeight);
    /*
     * Move brush background.
     */
    this._leftSide.attr('height', this._innerHeight + this._xAxisHeight - 1);
    this._rightSide.attr('height', this._innerHeight + this._xAxisHeight - 1);
    /*
     * Update brush using previously saved extent.
     */
    this._brushContainer.call(this._brush.extent(extent));
    /*
     * Resize brush gate's leafs.
     */
    if (!this._brush.empty()) {
        extent = this._brush.extent();
        var min = extent[0];
        var max = extent[1];
        this._leftSide.attr('x', 1)
            .attr('width', this._xScale(min));
        if (this._xScale.range()[1] > this._xScale(max) + 1)
            this._rightSide.attr('x', this._xScale(max))
                .attr('width', this._xScale.range()[1] - this._xScale(max) - 1);
    }
    /*
     * Change x axis bottom border length.
     */
    this._xAxisBorder.attr('x2', this._innerWidth);

    return this;
};


/**
 * Update chart.
 * @public
 * @param {Object[]} [data]
 * @returns {linechart.chart}
 */
linechart.navigation.prototype.update = function (data) {
    /*
     * Use current data if not provided.
     */
    data = data || this._data;
    /*
     * Stash reference to this object.
     */
    var self = this;
    /*
     * Get x extent.
     */
    this._xDomain = this._getXDomain();
    /*
     * Get y extent.
     */
    this._yDomain = this._getYDomain();
    /*
     * Update scale functions.
     */
    this._xScale.domain(this._xDomain);
    this._yScale.domain(this._yDomain);
    /*
     * Update chart axes.
     */
    this._xAxisContainer.call(this._xAxis);
    /*
     * Update lines.
     */
    this._line.attr('d', this._lineGenerator)
        .style('stroke', function (d, i) {
            return self._colors[i];
        });
    /*
     * Update x axis labels.
     */

    var xTicks = this._xScale.ticks(this._xAxis.ticks()[0]);
    var xStep = this._xScale(xTicks[1]) - this._xScale(xTicks[0]);
    this._xAxisContainer.selectAll('text')
        .attr('x', xStep / 2);

    if (this._brush.empty()) {
        this._resetBrush();
    }

    return this;
};


/**
 * Extract list of data sets names.
 * @private
 * @param {Object[][]} data
 * @returns {String[]}
 */
linechart.navigation.prototype._getLablesList = function (data) {

    return data.reduce(function (list, dataSet) {
        list.push(dataSet[0].category);
        return list;
    }, []);
};


/**
 * Reset brush.
 * @private
 */
linechart.navigation.prototype._resetBrush = function () {
    /*
     * Reset brush gate leafs.
     */
    this._leftSide.attr('width', 0);
    this._rightSide.attr('width', 0);
    /*
     * Set input domain as brush extent.
     */
    this._brush.extent(this._xScale.domain());
    /*
     * Resize brush.
     */
    this._brushContainer.call(this._brush);
};