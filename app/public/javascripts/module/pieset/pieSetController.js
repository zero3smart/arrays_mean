/**
 * 
 */
d3.select('#pie-set')
    .selectAll('li.gallery-item')
    .data(pieData)
    .enter()
    .append('li')
    .attr('class', 'gallery-item gallery-item-image pie-set-item')
    .each(function(d, i) {
        var pieChart = new PieChart(this, d.data);

        var container = d3.select(this);
        container.append('div')
            .attr('class', 'title')
            .text(d.title);
    });