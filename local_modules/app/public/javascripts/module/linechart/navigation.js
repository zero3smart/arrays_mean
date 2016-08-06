/**
 * @constructor
 * @param {Object[]} data
 * @param {linechart.viewport}
 */
linechart.navigation = function(data, viewport) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data;
    /**
     * 
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
     * Chart x axis.
     * @private
     * @member {Function}
     */
    this._xAxis = d3.svg.axis()
        .scale(this._xScale)
        .orient('bottom');
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
        .x(function(d) {
            return self._xScale(d.year);
        }).y(function(d) {
            return self._yScale(d.count);
        });
    /**
     * 
     */
    this._brush = d3.svg.brush()
        .x(self._xScale)
        .on('brush', function() {
            self._brushEventHandler();
        });
    /**
     * Chart margins.
     * @private
     * @member {Object}
     */
    this._margin = {
        top : 25,
        right : 0,
        bottom : 20,
        left : 45
    };
    /*
     * Set up window resize event handler.
     */
    var self = this;
    window.onresize = function() {
        self.resize();
        self.update();
    };
}


/**
 * Brush event handler.
 * @private
 * @returns
 */
linechart.navigation.prototype._brushEventHandler = function() {
    /*
     * Restore viewport if brush empty.
     */
    if (this._brush.empty()) {
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
    var data = this._data.map(function(series) {
        return series.filter(function(d) {
            if (d.year >= min && d.year <= max) {
                return true;
            }
        })
    });
    /*
     * Update brush side panels sizes.
     */
    this._leftSide.attr('x', 0)
        .attr('width', this._xScale(min))
        .attr('stroke-dasharray', '0 ' + this._xScale(min) + ' ' + this._innerHeight + ' ' + (this._xScale(min) + this._innerHeight));
    this._rightSide.attr('x', this._xScale(max))
        .attr('width', this._xScale(this._xScale.domain()[1]))
        .attr('stroke-dasharray', '0 ' + (this._xScale(this._xScale.domain()[1]) * 2 + this._innerHeight) + ' ' + this._innerHeight);
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
linechart.navigation.prototype.render = function(container) {
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
        .attr('class', 'x brush');
    /*
     * Set up chart dimension.
     */
    this.resize();
    /*
     * Populate with data.
     */
    this.update();

    return this;
};


/**
 * Resize chart.
 * @public
 * @returns {linechart.navigation}
 */
linechart.navigation.prototype.resize = function() {
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
    this._xAxis.tickSize(- this._innerHeight, 0);
    /*
     * Move x axis corresponding with chart height.
     */
    this._xAxisContainer.attr('transform', 'translate(0, ' + this._innerHeight + ')');
    /*
     * Resize brush.
     */
    this._brushContainer.call(this._brush)
        .selectAll('rect')
        .attr('height', this._innerHeight);
    /*
     * Move brush background.
     */
    this._leftSide.attr('height', this._innerHeight);
    this._rightSide.attr('height', this._innerHeight);

    return this;
};


/**
 * Get y extent.
 * @private
 * @return {Number}
 */
linechart.navigation.prototype._getYDomain = function() {

    return [0, this._data.reduce(function(maxValue, dataSet) {
        return Math.max(maxValue, d3.max(dataSet.map(function(d) {
            return d.count;
        })));
    }, 0)];
};


/**
 * Update chart.
 * @public
 * @param {Object[]} [data]
 * @returns {linechart.chart}
 */
linechart.navigation.prototype.update = function(data) {
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
    this._xDomain = d3.extent(this._data[0], function(d) {
        return d.year;
    });
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
        .style('stroke', function(d, i) {
            return self._colors[i];
        });

    return this;
};