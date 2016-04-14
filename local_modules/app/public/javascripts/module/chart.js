nv.addGraph(function() {
	var chart = nv.models.pieChart()
		.x(function(d) { return d.label; })
		.y(function(d) { return d.value; })
		.showLabels(false)
		.labelType('value');

	d3.select('#chart svg')
		.datum(pieData)
		.transition().duration(1200)
		.call(chart);

	return chart;
});