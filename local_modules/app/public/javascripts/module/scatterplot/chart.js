/**
 * @constructor
 * @param {Object[]} data
 * @param {Object} metaData
 */
scatterplot.chart = function(data, metaData) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data;
    /**
     * Chart meta data.
     * @private
     * @member {Object}
     */
    this._metaData = metaData;
    /**
     * Chart bubble's radius.
     * @private
     * @member {Integer}
     */
    this._radius = 15;
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
    this._xScale = d3.scale.linear();
    /**
     * Chart y scale function.
     * @private
     * @member {Function}
     */
    this._yScale = d3.scale.linear();
    /**
     * Axes cell's height.
     * @private
     * @member {Integer}
     */
    this._axesHeight = 20;
    /**
     * Chart x axis.
     * @private
     * @member {Function}
     */
    this._xAxis = d3.svg.axis()
        .scale(this._xScale)
        .orient('bottom');
    /**
     * Chart y axis.
     * @private
     * @member {Function}
     */
    this._yAxis = d3.svg.axis()
        .scale(this._yScale)
        .orient('left');
    /**
     * Chart x axis container.
     * @private
     * @member {Selection}
     */
    this._xAxisContainer = undefined;
    /**
     * Chart y axis container.
     * @private
     * @member {Selection}
     */
    this._yAxisContainer = undefined;
    /**
     * X axis bottom border.
     * @private
     * @param {Selection}
     */
    this._xAxisBorder = undefined;
    /**
     * Y axis left border.
     * @private
     * @param {Selection}
     */
    this._yAxisBorder = undefined;
    /**
     * Chart x label container.
     * @private
     * @member {Selection}
     */
    this._xLabelContainer = undefined;
    /**
     * Chart y label container.
     * @private
     * @member {Selection}
     */
    this._yLabelContainer = undefined;
    /**
     * Data x accessor.
     * @private
     * @member {Function}
     */
    this._xAccessor = function(d) { return d['x']; }
    /**
     * Data y accessor.
     * @private
     * @member {Function}
     */
    this._yAccessor = function(d) { return d['y']; }
    /**
     * X axis label.
     * @private
     * @member {String}
     */
    this._xLabel = 'x';
    /**
     * Y axis label.
     * @private
     * @member {String}
     */
    this._yLabel = 'y';
    /**
     * Chart margins.
     * @private
     * @member {Object}
     */
    this._margin = {
        top : this._radius * 3,
        right : this._radius,
        bottom : this._radius * 3,
        left : this._radius * 3
    };
    /**
     * View treshold.
     * @private
     * @member {Integer}
     */
    this._threshold = 300;
    /**
     * Chart view.
     * @private
     * @member {scatterplot.view}
     */
    this._view = new scatterplot.view.factory(this, this._threshold);
    /**
     * Current data search condition.
     * @private
     * @member {String[]}
     */
    this._searchBy = [];
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
 * Set chart color
 * @param {String} color
 * @returns {scatterplot.chart}
 */
scatterplot.chart.prototype.setColor = function(color) {

    this._color = color;

    return this;
};


/**
 * Filter data.
 * @param {String} key
 * @param {String} value
 * @return {scatterplot.chart}
 */
scatterplot.chart.prototype.searchBy = function(key, value) {

    if (key in this._metaData.fe_scatterplot_fieldsMap) {
        key = this._metaData.fe_scatterplot_fieldsMap[key];
    }

    this._searchBy = [key, value];

    return this;
};


/**
 * Render chart.
 * @public
 * @param {String} selector
 * @returns {scatterplot.chart}
 */
scatterplot.chart.prototype.render = function(selector) {
    /*
     * Select chart container.
     */
    this._container = d3.select(selector);
    /*
     * Check container is founded by provided selector.
     */
    if (this._container.size() === 0) {
        throw new Error('Cannot find HTML element by "' + selector + '" selector');
    }
    /*
     * Append SVG element.
     */
    this._svg = this._container.append('svg');
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
    this._xAxisBorder = this._xAxisContainer.append('line')
        .attr('x1', - this._axesHeight)
        .attr('y1', this._axesHeight)
        .attr('y2', this._axesHeight);
    /*
     * Append y axis container.
     */
    this._yAxisContainer = this._canvas.append('g')
        .attr('class', 'axis y-axis');
    this._yAxisBorder = this._yAxisContainer.append('line')
        .attr('x1', - this._axesHeight)
        .attr('y1', 0)
        .attr('x2', - this._axesHeight);
    /*
     * Append x lable container
     */
    this._xLabelContainer = this._svg.append('g')
        .attr('class', 'label x-label')
        .attr('text-anchor', 'middle')
        .append('text')
        .attr('letter-spacing', 2);
    /*
     * Append y label container.
     */
    this._yLabelContainer = this._svg.append('g')
        .attr('class', 'label y-label')
        .attr('text-anchor', 'middle')
        .append('text')
        .attr('letter-spacing', 2);
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
 * @returns {scatterplot.chart}
 */
scatterplot.chart.prototype.resize = function() {
    /*
     * Get container dimensions.
     */
    var dimension = this._container.node().getBoundingClientRect();
    /*
     * Set up chart outer and inner width and height.
     * TODO: for different screens height should be different.
     */
    this._outerWidth = dimension.width;
    this._innerWidth = this._outerWidth - this._margin.left - this._margin.right;
    this._outerHeight = 400;
    this._innerHeight = this._outerHeight - this._margin.top - this._margin.bottom;
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
    this._xAxis.tickSize(- this._innerHeight, this._axesHeight);
    this._yAxis.tickSize(- this._innerWidth, this._axesHeight);
    /*
     * Update axes borders.
     */
    this._xAxisBorder.attr('x2', this._innerWidth);
    this._yAxisBorder.attr('y2', this._innerHeight + this._axesHeight);
    /*
     * Move x axis corresponding with chart height.
     */
    this._xAxisContainer.attr('transform', 'translate(0, ' + this._innerHeight + ')');
    /*
     * Update chart labels position.
     */
    this._xLabelContainer
        .attr('transform', 'translate(' + (this._margin.left + this._innerWidth / 2) + ', ' + this._outerHeight + ')');
    this._yLabelContainer
        .attr('transform', 'translate(15, ' + (this._margin.top + this._innerHeight / 2) + ') rotate(-90)');

    return this;
};


/**
 * Normalize axis label.
 * @private
 * @param {String} label
 * @return {String}
 */
scatterplot.chart.prototype._normalizeLabel = function(label) {

    label = label.replace(/_/g, ' ');
    label = 'Number of ' + label;

    return label;
};


/**
 * Set data x accessor.
 * @public
 * @param {Function} [xAccessor]
 * @param {String} [xLabel]
 * @return {scatterplot.chart}
 */
scatterplot.chart.prototype.setXAccessor= function(xAccessor, xLabel) {

    if (xAccessor) {
        this._xAccessor = function(d) {
            var value = xAccessor(d);
            if (Array.isArray(value)) {
                return value.length;
            } else {
                return Number(value);
            }
        };
    }

    if (xLabel) {
        this._xLabel = xLabel;
    }

    return this;
};


/**
 * Set data y accessor.
 * @public
 * @param {Function} [yAccessor]
 * @param {String} [yLabel]
 * @return {scatterplot.chart}
 */
scatterplot.chart.prototype.setYAccessor = function(yAccessor, yLabel) {

    if (yAccessor) {
        this._yAccessor = function(d) {
            var value = yAccessor(d);
            if (Array.isArray(value)) {
                return value.length;
            } else {
                return Number(value);
            }
        };
    }

    if (yLabel) {
        this._yLabel = yLabel;
    }

    return this;
};


/**
 * Evaluate data extent.
 * @private
 * @param {Object[]} data
 * @param {Function} accessor
 * @returns [Number]
 */
scatterplot.chart.prototype._getDomain = function(data, accessor) {
    /*
     * Get data extent using accessor.
     */
    var domain = d3.extent(data, accessor);
    /*
     * If domain has no range - simulate it as 10% interval from the value.
     */
    if (domain[0] === domain[1]) {
        domain[0] = domain[0] * 0.9;
        domain[1] = domain[1] * 1.1;
    }

    return domain;
};


/**
 * Update chart.
 * @public
 * @param {Object[]} [data]
 * @returns {scatterplot.chart}
 */
scatterplot.chart.prototype.update = function(data) {
    /*
     * Use current data if not provided.
     */
    data = data || this._data;
    /*
     * Stash reference to this object.
     */
    var self = this;
    /*
     * Filter data by user search input.
     */
    if (this._searchBy.length && this._searchBy[1] !== '') {
        data = data.filter(function(d) {
            if (Array.isArray(d[self._searchBy[0]])) {
                return d[self._searchBy[0]].some(function(d) { return d.toLowerCase().indexOf(self._searchBy[1]) >= 0 })
            } else {
                return d[self._searchBy[0]].toLowerCase().indexOf(self._searchBy[1]) >= 0;
            }
        });
    }
    /*
     * Evaluate data x and y extent.
     */
    this._xDomain = this._getDomain(data, this._xAccessor);
    this._yDomain = this._getDomain(data, this._yAccessor);
    /*
     * Update scale functions.
     */
    this._xScale.domain(this._xDomain);
    this._yScale.domain(this._yDomain);
    /*
     * Update x axis.
     */
    var xBinLength = 150;
    var xBinsAmount = Math.floor(this._innerWidth / xBinLength);
    var min = d3.min(this._xScale.range());
    var max = d3.max(this._xScale.range());
    var xBinLength = (max - min) / (xBinsAmount - 1);

    var xTicks = [];
    for (var i = min; i <= max; i += xBinLength) {
        xTicks.push(this._xScale.invert(i));
    }

    this._xAxis.ticks(xTicks.length)
        .tickValues(xTicks)
        .tickFormat(function(d) {
            return d3.round(d, 1);
        });
    /*
     * Update y axis.
     */
    var yBinLength = 100;
    var yBinsAmount = Math.ceil(this._innerHeight / yBinLength);
    var min = d3.min(this._yScale.range());
    var max = d3.max(this._yScale.range());
    var yBinLength = (max - min) / (yBinsAmount - 1);

    var yTicks = [];
    for (var i = min; i <= max; i += yBinLength) {
        yTicks.push(this._yScale.invert(i));
    }

    this._yAxis.ticks(yTicks.length)
        .tickValues(yTicks.reverse())
        .tickFormat(function(d) {
            return d3.round(d, 1);
        });
    /*
     * Update x axis and extend ticks.
     */
    this._xAxisContainer.call(this._xAxis);
    this._xAxisContainer.selectAll('line').attr('y1', this._axesHeight);
    /*
     * Remove x axis first tick only once.
     */
    if (this._xAxisContainer.selectAll('text').size() === xTicks.length) {
        this._xAxisContainer.select('text').remove();
    }
    this._xAxisContainer.selectAll('text')
        .attr('x', xBinLength / - 2)
        .text(function(d, i) {
            return d3.round(xTicks[i], 1) + ' – ' + d3.round(d, 1);
        })
    /*
     * Update y axis and extend ticks.
     */
    this._yAxisContainer.call(this._yAxis);
    this._yAxisContainer.selectAll('line').attr('x1', - this._axesHeight);
    /*
     * Remove y axis last tick only once.
     */
    if (this._yAxisContainer.selectAll('text').size() === yTicks.length) {
        this._yAxisContainer.select('text').remove();
    }
    this._yAxisContainer.selectAll('text')
        .style('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('y', - this._axesHeight / 2)
        .attr('x', - yBinLength / 2)
        .text(function(d, i) {
            return d3.round(yTicks[i], 1) + ' – ' + d3.round(d, 1);
        });
    /*
     * Update axes labels.
     */
    this._xLabelContainer.text(this._normalizeLabel(this._xLabel));
    this._yLabelContainer.text(this._normalizeLabel(this._yLabel));
    /*
     * Check current view actuality.
     */
    if (data.length > this._threshold && this._view instanceof scatterplot.view.standard ||
        data.length <= this._threshold && this._view instanceof scatterplot.view.grouped) {
        this._view = new scatterplot.view.factory(this, this._threshold, data);
    }
    /*
     * Render chart content.
     */
    this._view.render(data);

    return this;
};


/**
 * Get filter function.
 * @param {String} key
 * @returns {Function}
 */
scatterplot.chart.prototype._getFilter = function(key) {

    return function(d, i) {
        return d[key] && ! /^\s*$/.test(d[key]);
    }
};


/**
 * Bubble mouse over event handler.
 * @private
 * @param {SVGElement} bubble
 * @param {Object} data
 */
scatterplot.chart.prototype._bubbleMouseOverEventHandler = function(bubble, data) {
    /*
     * Highlight bubble.
     */
    d3.select(bubble)
        .transition()
        .duration(500)
        .attr('r', function(d) {
            return d.radius + 10;
        }).style('opacity', 1);
    /*
     * Show tooltip.
     */
    this._view.showTooltip(bubble, data);
};


/**
 * Bubble mouse over event handler.
 * @private
 * @param {SVGElement} bubble
 */
scatterplot.chart.prototype._bubbleMouseOutEventHandler = function(bubble) {
    /*
     * Fade bubble.
     */
    d3.select(bubble)
        .transition()
        .duration(500)
        .attr('r', function(d) {
            return d.radius;
        }).style('opacity', 0.5);
    /*
     * Hide tooltip.
     */
    this._view.hideTooltip();
};