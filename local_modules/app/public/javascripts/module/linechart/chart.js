/**
 * @constructor
 * @param {Object[]} data
 */
linechart.chart = function(data) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data;
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
 * Render chart.
 * @public
 * @param {String} selector
 * @returns {linechart.chart}
 */
linechart.chart.prototype.render = function(selector) {
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
     * Render empty line.
     */
    this._line = this._canvas.selectAll('path.line')
        .data(this._data)
        .enter()
        .append('path')
        .attr('class', 'line');
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
 * @returns {linechart.chart}
 */
linechart.chart.prototype.resize = function() {
    /*
     * Get container dimensions.
     */
    var dimension = this._container.node().getBoundingClientRect();
    /*
     * Set up chart outer and inner width and height.
     */
    this._outerWidth = dimension.width;
    this._innerWidth = this._outerWidth - this._margin.left - this._margin.right;
    this._outerHeight = 400;
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
    this._yAxis.tickSize(- this._innerWidth, 0);
    /*
     * Move x axis corresponding with chart height.
     */
    this._xAxisContainer.attr('transform', 'translate(0, ' + this._innerHeight + ')');

    return this;
};


/**
 * Update chart.
 * @public
 * @param {Object[]} [data]
 * @returns {linechart.chart}
 */
linechart.chart.prototype.update = function(data) {
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
    this._yDomain = [0, d3.max(this._data[0], function(d) {
        return d.count;
    })];
    /*
     * Update scale functions.
     */
    this._xScale.domain(this._xDomain);
    this._yScale.domain(this._yDomain);
    /*
     * Update chart axes.
     */
    this._xAxisContainer.call(this._xAxis);
    this._yAxisContainer.call(this._yAxis);
    /*
     * Update lines.
     */
    this._line.attr("d", this._lineGenerator)
        .style('stroke', function(d, i) {
            return self._colors[i];
        });

    return this;
};