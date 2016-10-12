/**
 *
 */
function BarChart(selection, data, options) {
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
	var width = 1000,
		height = 1000;

	var color = d3.scale.ordinal()
		.range(colors);

	var svg = d3.select('#chart')
		.attr('width', width)
		.attr('height', height)
		.append('div')
		.classed('svg-container', true) //container class to make it responsive
		.append('svg')
		.attr('preserveAspectRatio', 'xMinYMin meet')
		.attr('viewBox', '0 0 ' + width + ' ' + height)
		.classed('svg-content-responsive', true)
		.append('g')
		.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
}