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

var colorMap = {};
legendData.forEach(function(d, i) {
    colorMap[d.label] = d.color ? d.color : colors[i % colors.length];
});

d3.select('#pie-set')
    .selectAll('li.gallery-item')
    .data(pieData)
    .enter()
    .append('li')
    .attr('class', 'gallery-item gallery-item-image pie-set-item')
    .each(function(d, i) {
        //set the title in the data object so it gets passed with the filter
        for(var dataObjectIndex = 0; dataObjectIndex < d.data.length; dataObjectIndex++) {
            d.data[dataObjectIndex].title = d.title
        }        
        pieChart = new PieChart(this, d.data, colorMap);

        var container = d3.select(this);
        container.append('div')
            .attr('class', 'title')
            .text(d.title);
    });

var sectors = d3.select('#pie-set')
    .selectAll('li.gallery-item')
    .selectAll('svg')
    .selectAll('g.arc > path')

/**
 * Tooltip
 */
var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'global-tooltip');

var tooltipKey = tooltip
    .append('span')
    .attr('class', 'tooltip-key');

var tooltipValue = tooltip
    .append('span')
    .attr('class', 'tooltip-value');

/**
 * Tooltip behavior on mouse hover
 */
sectors.on('mouseover', function(d) {
    tooltipKey.html(d.data.label);
    tooltipValue.html(d.data.valueToString);
    tooltip.style('display', 'block');
});

sectors.on('mousemove', function() {
    tooltip.style('top', (d3.event.pageY-15)+'px').style('left', (d3.event.pageX)+'px');
});

sectors.on('mouseout', function() {
    tooltip.style('display', 'none');
});

/**
 * Sidebar legend
 */
var legendList = d3.select('.legend-list');
var legendListItem = legendList.selectAll('.legend-list-item')
    .data(legendData)
    .enter()
    .append('li')
        .attr('class', 'legend-list-item');

var legendListLink = legendListItem.append('a');

legendListLink.append('span')
        .attr('class', 'legend-dot')
        .style('background-color', function(d, i) {
            return colorMap[d.label];
        });

legendListLink.attr('class', 'legend-list-link')
    .attr('href','javascript:;')
    .on('click',function(d) {
        var queryParamJoinChar = routePath_withoutFilter.indexOf('?') !== -1? '&' : '?';
        var filterObjForThisFilterColVal = constructedFilterObj(filterObj, groupBy, d.label, false);
        var filterJSONString = $.param(filterObjForThisFilterColVal);
        var urlForFilterValue = routePath_withoutFilter + queryParamJoinChar + filterJSONString;
        window.location = urlForFilterValue;
    })
    .on('mouseover', function(legendItemData, i) {

        d3.select(this).classed('active', true);

        sectors.style('opacity', function(d) {
            if (d.data.label == legendItemData.label) {
                return 1;
            } else {
                return 0.25;
            }
        });
    }).on('mouseout', function(d, i) {
        sectors.style('opacity', 1);
    }).append('span')
    .html(function(d) {
        return d.label;
    });