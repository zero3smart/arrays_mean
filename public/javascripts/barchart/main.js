$(document).ready(function() {
    var barChart;
    function renderBarChart() {
        barChart = BarChart.getInstance('#bar-chart', graphData, options);
    }

    // Handle of the "view by" - graph orientation, normalization
    function updateBarChartControls(options) {
        if (options.horizontal) {
            $('#orientation .horizontal').show();
            $('#orientation .vertical').hide();
        } else {
            $('#orientation .horizontal').hide();
            $('#orientation .vertical').show();
        }

        if (options.normalize) {
            $('#normalization .relative').show();
            $('#normalization .absolute').hide();
        } else {
            $('#normalization .relative').hide();
            $('#normalization .absolute').show();
        }

        if (options.sortDirection) {
            $('#sort-direction .icon-sort-descending').show();
            $('#sort-direction .icon-sort-ascending').hide();
        } else {
            $('#sort-direction .icon-sort-descending').hide();
            $('#sort-direction .icon-sort-ascending').show();
        }
    };

    $('#orientation').click(function(){
        options.horizontal = !options.horizontal;
        updateBarChartControls(options);
        renderBarChart();
    });

    $('#normalization').click(function(){
        options.normalize = !options.normalize;
        updateBarChartControls(options);
        renderBarChart();
    });

    $('#sort-direction').click(function(){
        options.sortDirection = !options.sortDirection;
        updateBarChartControls(options);
        barChart.updateSortDirection(options.sortDirection);
    });

    renderBarChart();

    window.onresize = function() {
        renderBarChart();
    };

    /**
     * Toggle legend
     */
    $('.legend-toggle').on('click', function(e) {
        setTimeout(renderBarChart, 400);
    });

    /**
     * Close legend
     */
    $('.legend-close').on('click', function(e) {
        setTimeout(renderBarChart, 400);
    });
});