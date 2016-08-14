/**
 * @constructor
 * @param {Object[]} data
 */
linechart.viewport = function(data) {
    /**
     * Chart data.
     * @private
     * @member {Object[][]}
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
        .tickPadding(25)
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
        right : 15,
        bottom : 20,
        left : 60
    };
    /**
     * Chart tooltip.
     * @private
     * @member {Tooltip}
     */
    this._tooltip = new Tooltip();
    /*
     * Set up window resize event handler.
     */
    var self = this;
    d3.select(window).on('resize.line-graph-viewport', function() {
        self.resize();
        self.update();
    });
}


/**
 * Render chart.
 * @public
 * @param {String} selector
 * @returns {linechart.viewport}
 */
linechart.viewport.prototype.render = function(container) {
    /*
     * Stash reference to this object.
     */
    var self = this;
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
        .attr('class', 'viewport');
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
     * Render line's containers.
     */
    this._series = this._canvas.selectAll('g.series')
        .data(this._data)
        .enter()
        .append('g')
        .attr('class', 'series');
    /*
     * Render empty line.
     */
    this._lines = this._series.append('path')
        .attr('class', 'line')
        .style('stroke', function(d, i) {
            return self._colors[i];
        });
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
 * @returns {linechart.viewport}
 */
linechart.viewport.prototype.resize = function() {
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
    this._yAxis.tickSize(- this._innerWidth, 0);
    /*
     * Move x axis corresponding with chart height.
     */
    this._xAxisContainer.attr('transform', 'translate(0, ' + this._innerHeight + ')');

    return this;
};


/**
 * Get y extent.
 * @private
 * @return {Number}
 */
linechart.viewport.prototype._getYDomain = function() {

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
linechart.viewport.prototype.update = function(data) {
    /*
     * Use current data if not provided.
     */
    if (data) {
        this._data = data;
    }
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
    this._yDomain = this._getYDomain(this._data);
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
     * Update series.
     */
    this._series.data(this._data)
    /*
     * Update and move lines.
     */
    this._lines.data(this._data)
        .attr("d", this._lineGenerator);
    /*
     * Update circles.
     */
    var circles = this._series.selectAll('circle.data-point')
        .data(function (d) {
            return d;
        });
    /*
     * Enter new circles.
     */
    circles.enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', function (d) {
            return self._xScale(d.year);
        }).attr('cy', function (d) {
            return self._yScale(d.count);
        }).attr('r', 5)
        .on('mouseenter', function(d, i, j) {
            d3.select(this).style('fill', self._colors[j]);
            self._tooltip.setContent(
                '<div class="default-tooltip-content">' +
                    '<div class="line-graph-tooltip-circle" style="background-color:' + self._colors[j] + ';"></div>' +
                    '<div class="scatterplot-tooltip-title nowrap">Something: ' + d.count + ' Occurences</div>' +
                '</div>')
                .setPosition('top')
                .show(this);

        }).on('mouseout', function(d, i, j) {
            d3.select(this).style('fill', null);
            self._tooltip.hide();
        })

    return this;
};