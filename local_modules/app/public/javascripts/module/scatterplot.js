/**
 * @constructor
 * @param {Object[]}
 */
function arraysCoScatterPlot(data) {

    this._data = data;
    this._radius = 10;
    this._container = undefined;
    this._outerWitdh = undefined;
    this._outerHeight = undefined;
    this._svg = undefined;
    this._canvas = undefined;
    this._xScale = d3.scale.linear();
    this._yScale = d3.scale.linear();
    this._xAxis = d3.svg.axis()
        .scale(this._xScale)
        .orient('bottom');
    this._yAxis = d3.svg.axis()
        .scale(this._yScale)
        .orient('left');
    this._xAxisContainer = undefined;
    this._yAxisContainer = undefined;
    this._margin = {
        top : this._radius,
        right : this._radius,
        bottom : 20,
        left : 20
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
     * Configure 
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
     * Calculate x domain.
     */
    this._xDomain = d3.extent(data, function(d) {
        return Number(d.rowParams.comics_available);
    });
    /*
     * Calculate y domain.
     */
    this._yDomain = d3.extent(data, function(d) {
        return Number(d.rowParams.series_available);
    });
    /*
     * Update scale functions.
     */
    this._xScale.domain(this._xDomain);
    this._yScale.domain(this._yDomain);
    /*
     * Update axis.
     */
    this._xAxisContainer.call(this._xAxis);
    this._yAxisContainer.call(this._yAxis);
    /*
     * Render bubbles.
     */
    var self = this;
    this._canvas.selectAll('circle.bubble')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'bubble')
        .attr('cx', function(d) {
            return self._xScale(d.rowParams.comics_available)
        }).attr('cy', function(d) {
            return self._yScale(d.rowParams.series_available)
        }).attr('r', 0)
        .transition()
        .duration(1000)
        .attr('r', this._radius);

    return this;
};