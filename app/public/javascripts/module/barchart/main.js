$(document).ready(function() {
    if (typeof(Storage) !== "undefined") {
        var oldVal = localStorage.getItem('normalize');
        if (oldVal) options.normalize = oldVal == 'true';
        oldVal = localStorage.getItem('horizontal');
        if (oldVal) options.horizontal = oldVal == 'true';
        oldVal = localStorage.getItem('sortDirection');
        if (oldVal) options.sortDirection = oldVal == 'true';

        updateBarChartControls(options);
    }

    var barChart;
    function renderBarChart() {
        barChart = BarChart.getInstance('#bar-chart', graphData, options);
    }

    // Handle of the "view by" - graph orientation, normalization
    function updateBarChartControls(options) {
        localStorage.setItem('horizontal', options.horizontal);
        localStorage.setItem('normalize', options.normalize);
        localStorage.setItem('sortDirection', options.sortDirection);

        if (options.horizontal) {
            $('#orientation .horizontal').hide();
            $('#orientation .vertical').show();
        } else {
            $('#orientation .horizontal').show();
            $('#orientation .vertical').hide();
        }

        if (options.normalize) {
            $('#normalization .relative').hide();
            $('#normalization .absolute').show();
        } else {
            $('#normalization .relative').show();
            $('#normalization .absolute').hide();
        }

        if (options.sortDirection) {
            $('#sort-direction .icon-sort-descending').hide();
            $('#sort-direction .icon-sort-ascending').show();
        } else {
            $('#sort-direction .icon-sort-descending').show();
            $('#sort-direction .icon-sort-ascending').hide();
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