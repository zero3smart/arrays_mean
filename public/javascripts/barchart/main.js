$(document).ready(function() {
    var barChart;
    function renderBarChart() {
        options = getCookies();
        if(!options.hasOwnProperty('horizontal')) {
            options['horizontal'] = false;
        }
        barChart = BarChart.getInstance('#bar-chart', graphData, options);
    }

    function getCookies () {
        var options = {};
        var cookiesArray = document.cookie.split(';', 4);
        for(var i = 0; i < cookiesArray.length; i++) {
            var key = cookiesArray[i].split('=')[0];
            if(key[0] == ' ') {
                key = key.slice(1);
            }
            var value = cookiesArray[i].split('=')[1];
            if(value == 'undefined' || value == 'false') {
                value = false;
            } else {
                value = true;
            }
            if(key == 'horizontal' || key == 'padding' || key == 'sortDirection' || key == 'normalize') {
                options[key] = value;
            } else {
                continue;
            }
        }
        return options;
    }

    // Handle of the "view by" - graph orientation, normalization
    function updateBarChartControls() {
        var yAxisDropdown = $('#Y-Axis').parent();
        var xAxisDropdown = $('#X-Axis').parent();

        options = getCookies();

        if (options.horizontal) {
            $('#orientation .horizontal').show();
            $('#orientation .vertical').hide();

            yAxisDropdown.insertBefore(xAxisDropdown);
            // swap labels
            $('#Y-Axis span.label').text('X Axis');
            $('#X-Axis span.label').text('Y Axis');
        } else {
            $('#orientation .horizontal').hide();
            $('#orientation .vertical').show();

            xAxisDropdown.insertBefore(yAxisDropdown);
            $('#Y-Axis span.label').text('Y Axis');
            $('#X-Axis span.label').text('X Axis');
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
    }

    $('#orientation').click(function(){
        options.horizontal = !options.horizontal;
        setCookies(options);
        updateBarChartControls();
        renderBarChart();
    });

    $('#normalization').click(function(){
        options.normalize = !options.normalize;
        setCookies(options);
        updateBarChartControls();
        renderBarChart();
    });

    $('#sort-direction').click(function(){
        options.sortDirection = !options.sortDirection;
        setCookies(options);
        updateBarChartControls();
        barChart.updateSortDirection(options.sortDirection);
    });

    renderBarChart();

    window.onresize = function() {
        renderBarChart();
    };

    setCookies = function (options) {
        document.cookie = 'horizontal=' + options['horizontal'] +';';
        document.cookie = 'padding=' + options['padding'] + ';';
        document.cookie = 'sortDirection=' + options['sortDirection'] +';';
        document.cookie = 'normalize=' + options['normalize'] + ';';
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
