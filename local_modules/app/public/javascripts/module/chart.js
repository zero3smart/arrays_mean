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
		.labelType('value');

	d3.select('#chart svg')
		.datum(pieData)
		.transition().duration(1200)
		.call(chart);

	return chart;
});