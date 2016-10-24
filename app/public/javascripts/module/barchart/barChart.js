/**
 * 
 */
function BarChart(selector, dataSet, options) {

    this._categories = dataSet.categories;
    this._data = dataSet.data;
    this._options = options;
    this._padding = options.padding || 0.2;
    this._precise = options.precise || 2;
    this._margin = {
        top : 25,
        right : 15,
        bottom : 30,
        left : options.isHorizontal ? 120 : 70
    };

    if ('margin' in options) {
        for (var side in options.margin) {
            this._margin[side] = options.margin[side];
        }
    }

    var self = this;

    var colors = d3.scale.category20().range();
    if (dataSet.colors) {
        for(var i = 0; i < dataSet.colors.length; i ++) {
            colors[i] = dataSet.colors[i];
        }
    }

    this._colors = {};
    i = 0;
    this._data.forEach(function(col) {
        col.forEach(function(d) {
            if (!self._colors[d.label]) self._colors[d.label] = colors[i++];
        });
    });

    /**
     * Chart tooltip.
     * @private
     * @member {Tooltip}
     */
    this._tooltip = new Tooltip();
    /**
     * Chart container.
     * @private
     * @member {Selection}
     */
    this._container = d3.select(selector);

    var dimension = this._container.node().getBoundingClientRect();

    this._outerWidth = dimension.width;
    this._outerHeight = dimension.height;
    this._innerWidth = this._outerWidth - this._margin.left - this._margin.right;
    this._innerHeight = this._outerHeight - this._margin.top - this._margin.bottom;

    this._svg = this._container.append('svg')
        .attr('width', this._outerWidth)
        .attr('height', this._outerHeight);

    this._canvas = this._svg.append('g')
        .attr('transform', 'translate(' + this._margin.left + ', ' + this._margin.top + ')');

    this._xAxisContainer = this._canvas.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', this.getXAxisTransform())
      .call(this.getXAxis());

    this._yAxisContainer = this._canvas.append('g')
      .attr('class', 'axis axis-y')
      .attr('transform', this.getYAxisTransform())
      .call(this.getYAxis());

    /**
     * Append bar's series.
     */
    this._bars = this._canvas.append('g')
        .attr('class', 'bars')
        .selectAll('g.series')
        .data(this.getChartData())
        .enter()
        .append('g')
        .attr('class', 'series')
        .selectAll('rect.bar')
        .data(function(d, i) {
            return d;
        }).enter()
        .append('rect')
        .attr('class', 'bar')
        .style('fill', function(d, i, j) {
            return self._colors[d.label];
        }).on('mouseenter', function(d, i, j) {
            self._barMouseEnterEventHandler(this, d, i, j);
        }).on('mouseout', function(d, i, j) {
            self._barMouseOutEventHandler(this, d, i, j);
        });

    this._animate();
};


/**
 * Normalize input data.
 * @returns {Object[]}
 */
BarChart.prototype.normalize = function() {

    return this._data.map(function(series) {
        /*
         * Get column max value.
         */
        var columnMax = d3.sum(series.map(function(d) {
            return d.value;
        }))
        /*
         * Devide every column's value to the max value.
         */
        return series.map(function(d) {
            d.value = d.value / columnMax;
            return d;
        });
    });
};


/**
 * Get numeric domain max value.
 * @returns {Number}
 */
BarChart.prototype.getMaxValue = function() {

    if (this._options.normalize) {
        return 1;
    }
    /*
     * Evaluate max value.
     */
    return d3.max(this._data.reduce(function(values, series) {
        return values.concat(d3.sum(series.map(function(d) {
            return d.value;
        })));
    }, []));
};


BarChart.prototype.getValueFormatter = function() {

    var self = this;

    if (this._options.normalize) {
        return function(d) {
            return d3.round(d * 100, self._precise) + '%';
        };
    } else {
        return function(d) {
            return d3.round(d, self._precise);
        }
    }
};


/**
 * Bar mouse in event handler.
 * @param {SVGElement} barElement - bar SVG node
 * @param {Object} barData - bar data
 * @param {Integer} i - bar number within series
 * @param {Integer} j - series number
 */
BarChart.prototype._barMouseEnterEventHandler = function(barElement, barData, i, j) {

    this._canvas.selectAll('rect.bar')
        .filter(function() {
            return this != barElement;
        }).style('opacity', 0.2);

    var formatter = this.getValueFormatter();

    this._tooltip.setContent(
        '<div>' +
            '<div class="scatterplot-tooltip-title">' +
                '<div>' + barData.label + '</div>' +
            '</div>' +
            '<div class="scatterplot-tooltip-content">' + formatter(barData.value) + '</div>' +
        '</div>')
        .setPosition('top')
        .show(barElement);
};


/**
 * Bar mouse out event handler.
 * @param {SVGElement} barElement - bar SVG node
 * @param {Object} barData - bar data
 * @param {Integer} i - bar number within series
 * @param {Integer} j - series number
 */
BarChart.prototype._barMouseOutEventHandler = function(barElement, barData, i, j) {

    this._canvas.selectAll('rect.bar')
        .filter(function() {
            return this != barElement;
        }).style('opacity', 1);

    this._tooltip.hide();
};


/**
 * Get chart data.
 * @returns {Object[][]}
 */
BarChart.prototype.getChartData = function() {
    if (this._options.normalize) {
        return this.normalize();
    } else {
        return this._data;
    }
};


/**
 * Factory method.
 * @param {String} selector
 * @param {Object} dataSet
 * @param {Object} options
 * @returns {BarChart}
 */
BarChart.getInstance = function(selector, dataSet, options) {

    $(selector).empty();
    if (options.isHorizontal === true) {
        return new HorizontalBarChart(selector, dataSet, options);
    } else {
        return new VerticalBarChart(selector, dataSet, options);
    }
};