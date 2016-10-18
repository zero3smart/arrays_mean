/**
 * 
 */
function BarChart(selector, dataSet, options) {

    this._data = dataSet.data;
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

    var outerWidth = dimension.width;
    var outerHeight = dimension.height;
    var innerWidth = outerWidth - this._margin.left - this._margin.right;
    var innerHeight = outerHeight - this._margin.top - this._margin.bottom;

    this._svg = container.append('svg')
        .attr('width', outerWidth)
        .attr('height', outerHeight);

    this._canvas = this._svg.append('g')
        .attr('transform', 'translate(' + this._margin.left + ', ' + this._margin.top + ')');

    this._xDomain = dataSet.categories;
    /*
     * 
     */
    var max = d3.max(this._data.reduce(function(values, series) {
        return values.concat(d3.sum(series.map(function(d) {
            return d.value;
        })));
    }, []));

    this._yDomain = [0, max];

    this._xScale = d3.scale.ordinal()
        .rangeRoundBands([0, innerWidth], 0.05)
        .domain(this._xDomain);

    this._yScale = d3.scale.linear()
        .range([innerHeight, 0])
        .domain(this._yDomain);

    this._xAxis = d3.svg.axis()
        .scale(this._xScale)
        .orient("bottom");

    this._yAxis = d3.svg.axis()
        .scale(this._yScale)
        .orient("left");

    this._xAxisContainer = this._canvas.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", "translate(0, " + innerHeight + ")")
      .call(this._xAxis);

    this._yAxisContainer = this._canvas.append("g")
      .attr("class", "axis axis-y")
      .attr("transform", "translate(0, 0)")
      .call(this._yAxis);

    var self = this;
    this._canvas.append('g')
        .attr('class', 'bars')
        .selectAll('g.series')
        .data(this._data)
        .enter()
        .append('g')
        .attr('class', 'series')
        .selectAll('rect.bar')
        .data(function(d, i) {
            return d;
        }).enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('width', this._xScale.rangeBand())
        .attr('height', function(d) {
            return innerHeight - self._yScale(d.value);
        }).attr('x', function(d, i, j) {
            return self._xScale(dataSet.categories[j]);
        }).attr('y', function(d, i, j) {

            var y = 0;

            for (var k = 0; k <= i; k ++) {
                y += innerHeight - self._yScale(self._data[j][k].value);
            }

            return innerHeight - y;
        }).style('fill', function(d, i, j) {
            return dataSet.colors[i];
        }).style('opacity', 0.8);
}












