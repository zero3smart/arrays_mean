$(document).ready(function() {
    if (typeof(Storage) !== "undefined") {
        var oldVal = localStorage.getItem('normalize');
        if (oldVal) options.normalize = oldVal == 'true';
        oldVal = localStorage.getItem('isHorizontal');
        if (oldVal) options.isHorizontal = oldVal == 'true';

        updateBarChartControls(options);
    }

    function renderBarChart() {
        BarChart.getInstance('#bar-chart', $.extend(true, {}, graphData), options);
    }

    // Handle of the "view by" - graph direction, normalization
    function updateBarChartControls(options) {
        localStorage.setItem('isHorizontal', options.isHorizontal);
        localStorage.setItem('normalize', options.normalize);

        if (options.isHorizontal) {
            $('#direction .horizontal').hide();
            $('#direction .vertical').show();
        } else {
            $('#direction .horizontal').show();
            $('#direction .vertical').hide();
        }

        if (options.normalize) {
            $('#normalization .relative').hide();
            $('#normalization .absolute').show();
        } else {
            $('#normalization .relative').show();
            $('#normalization .absolute').hide();
        }
    };

    $('#direction').click(function(){
        options.isHorizontal = !options.isHorizontal;
        updateBarChartControls(options);
        renderBarChart();
    });

    $('#normalization').click(function(){
        options.normalize = !options.normalize;
        updateBarChartControls(options);
        renderBarChart();
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