/**
 * @constructor
 * @param {Object[]}
 */
function arraysCoScatterPlot(data) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data;
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
     * Chart tooltip.
     * @private
     * @member {Tooltip}
     */
    this._tooltip = new Tooltip();
    /**
     * Chart margins.
     * @private
     * @member {Object}
     */
    this._margin = {
        top : this._radius * 2,
        right : this._radius,
        bottom : 40,
        left : 45
    };
}


/**
 * Render chart.
 * @public
 * @param {String} selector
 * @returns {arraysCoScatterPlot}
 */
arraysCoScatterPlot.prototype.render = function(selector) {
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
    /*
     * Append y axis container.
     */
    this._yAxisContainer = this._canvas.append('g')
        .attr('class', 'axis y-axis');
    /*
     * Append x lable container
     */
    this._xLabelContainer = this._svg.append('g')
        .attr('class', 'label x-label')
        .attr('text-anchor', 'middle')
        .append('text');
    /*
     * Append y label container.
     */
    this._yLabelContainer = this._svg.append('g')
        .attr('class', 'label y-label')
        .attr('text-anchor', 'middle')
        .append('text');
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
 * @returns {arraysCoScatterPlot}
 */
arraysCoScatterPlot.prototype.resize = function() {
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
     * Move x axis corresponding with chart height.
     */
    this._xAxisContainer.attr('transform', 'translate(0, ' + this._innerHeight + ')');
    /*
     * Update chart labels position.
     */
    this._xLabelContainer
        .attr('transform', 'translate(' + (this._innerWidth / 2) + ', ' + this._outerHeight + ')');
    this._yLabelContainer
        .attr('transform', 'translate(15, ' + (this._innerHeight / 2) + ') rotate(-90)');

    return this;
};


/**
 * Normalize axis label.
 * @private
 * @param {String} label
 * @return {String}
 */
arraysCoScatterPlot.prototype._normalizeLabel = function(label) {

    label = label.replace('_', ' ');

    return label;
};


/**
 * Set data x accessor.
 * @public
 * @param {Function} [xAccessor]
 * @param {String} [xLabel]
 * @return {arraysCoScatterPlot}
 */
arraysCoScatterPlot.prototype.setXAccessor= function(xAccessor, xLabel) {


    if (xAccessor) {
        this._xAccessor = xAccessor;
    }

    if (xLabel) {
        this._xLabel = this._normalizeLabel(xLabel);
    }

    return this;
};


/**
 * Set data y accessor.
 * @public
 * @param {Function} [yAccessor]
 * @param {String} [yLabel]
 * @return {arraysCoScatterPlot}
 */
arraysCoScatterPlot.prototype.setYAccessor = function(yAccessor, yLabel) {

    if (yAccessor) {
        this._yAccessor = yAccessor;
    }

    if (yLabel) {
        this._yLabel = this._normalizeLabel(yLabel);
    }

    return this;
};


/**
 * Update chart.
 * @public
 * @param {Object[]} [data]
 * @returns {arraysCoScatterPlot}
 */
arraysCoScatterPlot.prototype.update = function(data) {
    /*
     * Use current data if not provided.
     */
    data = data || this._data;
    /*
     * Stash reference to this object.
     */
    var self = this;
    /*
     * Calculate x domain.
     */
    this._xDomain = d3.extent(data, function(d) {
        return Number(self._xAccessor.call(undefined, d));
    });
    /*
     * Calculate y domain.
     */
    this._yDomain = d3.extent(data, function(d) {
        return Number(self._yAccessor.call(undefined, d));
    });
    /*
     * Update scale functions.
     */
    this._xScale.domain(this._xDomain);
    this._yScale.domain(this._yDomain);
    /*
     * Update axes.
     */
    this._xAxisContainer.call(this._xAxis);
    this._yAxisContainer.call(this._yAxis);
    /*
     * Update axes labels.
     */
    this._xLabelContainer.text(this._xLabel);
    this._yLabelContainer.text(this._yLabel);
    /*
     * Render bubbles.
     */
    this._canvas.selectAll('circle.bubble')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'bubble')
        .style('opacity', 0.5)
        .attr('cx', function(d) {
            return self._xScale(self._xAccessor.call(undefined, d))
        }).attr('cy', function(d) {
            return self._yScale(self._yAccessor.call(undefined, d))
        }).attr('r', 0)
        .transition()
        .duration(1000)
        .attr('r', this._radius)
        .each('end', function(d) {
            d3.select(this).on('mouseover', function(d) {
                self._bubbleMouseOverEventHandler(this, d);
            }).on('mouseout', function(d) {
                self._bubbleMouseOutEventHandler(this);
            });
        })

    return this;
};


/**
 * Bubble mouse over event handler.
 * @private
 * @param {SVGElement} bubble
 * @param {Object} data
 */
arraysCoScatterPlot.prototype._bubbleMouseOverEventHandler = function(bubble, data) {
    /*
     * Highlight bubble.
     */
    d3.select(bubble)
        .transition()
        .duration(500)
        .style('opacity', 1)
    /*
     * Show tooltip.
     */
    this._tooltip.setContent(
        '<div class="scatterplot-tooltip-container">' +
            '<div class="scatterplot-tooltip-image" style="background-image:url(' + data.thumb_small + ')"></div>' +
            '<div class="scatterplot-tooltip-title">' + data.name + '</div>' +
        '</div>')
        .show(bubble);
};


/**
 * Bubble mouse over event handler.
 * @private
 * @param {SVGElement} bubble
 */
arraysCoScatterPlot.prototype._bubbleMouseOutEventHandler = function(bubble) {
    /*
     * Fade bubble.
     */
    d3.select(bubble)
        .transition()
        .duration(500)
        .style('opacity', 0.5)
    /*
     * Hide tooltip.
     */
    this._tooltip.hide();
};