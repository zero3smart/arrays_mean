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
 * Set up pie chart
 */
var width = 600,
	height = 600,
	radius = Math.min(width, height) / 2;

var color = d3.scale.ordinal()
	.range(colors);

var arc = d3.svg.arc()
	.outerRadius(radius - 10)
	.innerRadius(0);

var pie = d3.layout.pie()
	.sort(null)
	.value(function(d) {
		return d.value;
	});

var svg = d3.select('#chart')
	.attr('width', width)
	.attr('height', height)
	.append('div')
		.classed('svg-container', true) //container class to make it responsive
		.append('svg')
			.attr('preserveAspectRatio', 'xMinYMin meet')
			.attr('viewBox', '0 0 600 600')
			.classed('svg-content-responsive', true)
			.append('g')
				.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

/**
 * Place background circle
 */
svg.append('circle')
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r', radius - 10)
	.attr('class', 'pie-background');

var g = svg.selectAll('.arc')
	.data(pie(pieData))
	.enter()
	.append('g')
		.attr('class', 'arc');

g.append('path')
	.attr('d', arc)
	.style('fill', function(d) {
		return color(d.value);
	});

/**
 * Tooltip
 */
var tooltip = d3.select('body')
	.append('div')
	.attr('class', 'chart-tooltip');

var tooltipKey = tooltip
	.append('span')
	.attr('class', 'tooltip-key');

var tooltipValue = tooltip
	.append('span')
	.attr('class', 'tooltip-value');

/**
 * Tooltip behavior on mouse hover
 */
g.on('mouseover', function(d) {
	tooltipKey.html(d.data.label);
	tooltipValue.html(d.data.value);
	tooltip.style('display', 'block');
});

g.on('mousemove', function() {
	tooltip.style('top', (event.pageY-75)+'px').style('left', (event.pageX)+'px');
});

g.on('mouseout', function() {
	tooltip.style('display', 'none');
});


/**
 * Sidebar legend
 */
var legendList = d3.select('.legend-list');
var legendListItem = legendList.selectAll('.legend-list-item')
	.data(pieData)
	.enter()
	.append('li')
		.attr('class', 'legend-list-item');

legendListItem.append('span')
	.attr('class', 'legend-dot')
	.style('background-color', function(d, i) {
		var colorIndex = i % colors.length;
		return colors[colorIndex];
	});

legendListItem.append('a')
	.attr('class', 'legend-list-link')
	.attr('href', '#')
	.html(function(d) {
		return d.label;
	})
	.on('click', function(d, i) {

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