/**
 * 
 */
function PieChart(selection, pieData, colorMap) {
    /**
     * Set up pie chart
     */
    var width = 1000,
        height = 1000,
        radius = Math.min(width, height) / 2;

    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d.value;
        });

    var svg = d3.select(selection)
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
    /**
     * Add blur filter definition for drop shadow
     */
    var defs = svg.append('defs');

    var filter = defs.append('filter')
        .attr('id', 'drop-shadow')
        .attr('height', '150%');

    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 4)
        .attr('result', 'blur');

    filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 0)
        .attr('dy', 4);
    /**
     * Blur opacity
     */
    var feComponentTransfer = filter.append('feComponentTransfer');
    feComponentTransfer.append('feFuncA')
        .attr('type', 'linear')
        .attr('slope', '0.2');
    /**
     * Merge blurs
     */
    var feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode');
    feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');
    /**
     * Place background circle
     */
    svg.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', radius - 10)
        .attr('class', 'pie-background')
        .style('filter', 'url(#drop-shadow)');
    /**
     * Place groups
     */
    var g = svg.selectAll('.arc')
        .data(pie(pieData))
        .enter()
        .append('g')
            .attr('class', 'arc');
    /**
     * Place paths
     */
    var slices = g.append('path')
        .attr('d', arc)
        .style('fill', function(d, i) {
            console.log(d)
            return colorMap[d.data.label];
        }).attr('id', function(d, i) {
            return 'slice-' + i;
        });
}