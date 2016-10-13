/**
 *
 */
function BarChart(selector, data, options) {
	var colors = [
		'#FEAA00',
		'#FEBC12',
		'#FECC4B',
		'#FFDE82',
		'#008E8C',
		'#26A4A2',
		'#53BAB8',
		'#87D0D0',
		'#0036FF',
		'#235EFF',
		'#5284FF',
		'#86ACFF',
		'#6500F8',
		'#8200FB',
		'#9E3FFD',
		'#BE7DFD',
		'#FE00FF',
		'#FE33FF',
		'#FE66FF',
		'#FE99FF',
		'#FA2A00',
		'#FB5533'
	];


	/**
	 * Set up bar chart
	 */
	var container = d3.select(selector);

	var dimension = container.node().getBoundingClientRect();

	var margins = {
		top: 25,
		right: 15,
		bottom: 30,
		left: 70
	};

	var outerWidth = dimension.width,
		outerHeight = dimension.height,
		innerWidth = outerWidth - margins.left - margins.right,
		innerHeight = outerHeight - margins.top - margins.bottom;

	var color = d3.scale.ordinal()
		.range(colors);

	var svg = container.append('svg')
		.attr('width', outerWidth)
		.attr('height', outerHeight);

	var canvas = svg.append('g')
		.attr('transform', 'translate(' + this._margin.left + ', ' + this._margin.top + ')');

	var xAxisContainer = canvas.append('g')
		.attr('class', 'axis x-axis'),
		yAxisContainer = canvas.append('g')
		.attr('class', 'axis y-axis');

	var series = canvas.selectAll('g.series')
		.data(data)
		.enter()
		.append('g')
		.attr('class', 'series');

	d3.select(window).on('resize.bar-chart', function() {

	});
}