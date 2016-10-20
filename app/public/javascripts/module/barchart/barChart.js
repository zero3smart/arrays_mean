/**
 * 
 */
function BarChart(selector, dataSet, options) {

    this._categories = dataSet.categories;
    this._data = dataSet.data;
    this._options = options;
    this._padding = options.padding || 0.2;
    /**
     * Set up bar chart
     */
    var container = d3.select(selector);

    var dimension = container.node().getBoundingClientRect();

    this._margin = {
        top : 25,
        right : 15,
        bottom : 30,
        left : 70
    };

    this._outerWidth = dimension.width;
    this._outerHeight = dimension.height;
    this._innerWidth = this._outerWidth - this._margin.left - this._margin.right;
    this._innerHeight = this._outerHeight - this._margin.top - this._margin.bottom;

    this._svg = container.append('svg')
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

    var self = this;
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
            return dataSet.colors[i];
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


BarChart.prototype._barMouseEnterEventHandler = function(bar, d, i, j) {

    this._canvas.selectAll('rect.bar')
        .filter(function(a, b, c) {
            return this != bar;
        }).style('opacity', 0.2)
};


BarChart.prototype._barMouseOutEventHandler = function(bar, d, i, j) {

    this._canvas.selectAll('rect.bar')
        .filter(function(a, b, c) {
            return this != bar;
        }).style('opacity', 1)
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

    if (options.isHorizontal === true) {
        return new HorizontalBarChart(selector, dataSet, options);
    } else {
        return new VerticalBarChart(selector, dataSet, options);
    }
};