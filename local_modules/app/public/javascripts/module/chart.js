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

nv.addGraph(function() {
	var chart = nv.models.pieChart()
		.x(function(d) { return d.label; })
		.y(function(d) { return d.value; })
		.showLabels(false)
		.color(colors)
		.margin({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		})
		.legendPosition('right')
		.showLegend(false)
		.labelType('value');

	d3.select('#chart')
		.append('div')
			.classed('svg-container', true) //container class to make it responsive
			.append('svg')
				.attr('preserveAspectRatio', 'xMinYMin meet')
				.attr('viewBox', '0 0 600 600')
				.classed('svg-content-responsive', true)
				.datum(pieData)
				.transition().duration(1200)
				.call(chart);

	return chart;
});

/**
 * Toggle legend
 */
$('.legend-toggle').on('click', function(e) {
	e.preventDefault();
	$('body').toggleClass('legend-open');
});

/**
 * Close legend
 */
$('.legend-close').on('click', function(e) {
	e.preventDefault();
	$('body').removeClass('legend-open');
});