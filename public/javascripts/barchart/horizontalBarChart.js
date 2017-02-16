/**
 * Horizontal bar chart implementation.
 * @param {String} selector
 * @param {Object} dataSet
 * @param {Object} options
 */
function HorizontalBarChart(selector, dataSet, options) {

    BarChart.call(this, selector, dataSet, options);
}


HorizontalBarChart.prototype = Object.create(BarChart.prototype);


HorizontalBarChart.prototype._animate = function() {

    var self = this;

    this._bars.attr('height', function(d, i, j) {
            return isNaN(self.getBarHeight(d, i, j)) ? 0 : self.getBarHeight(d, i, j);
        }).attr('y', function(d, i, j) {
            return isNaN(self.getBarY(d, i, j)) ? 0 : self.getBarY(d, i, j);
        }).attr('width', 0)
        .attr('x', 0);

    this._bars.transition()
        .duration(1000)
        .attr('width', function(d, i, j) {
            return self.getBarWidth(d, i, j);
        }).attr('x', function(d, i, j) {
            return self.getBarX(d, i, j);
        });
};

HorizontalBarChart.prototype.rotateYLabel = function() {
    if(this._showYLabels) {
        return true;
    } else {

        return this._yAxisContainer.selectAll("g")
        .style("visibility", "hidden")

    }
};

HorizontalBarChart.prototype.rotateXLabel = function() {
    if(this._showXLabels) {
        return this._xAxisContainer.selectAll("g")
        .style("visibility", "visible")
    }
}

HorizontalBarChart.prototype._animateForSort = function() {

    var self = this;
    var originalCategories = this._categories; // simple fix
    var newCategories = this._categories
        .reduce(function(o, v, i) {
            o.push([v, self._data[i]]);
            return o;
        }, [])
        .sort(!this._options.sortDirection ? function(a, b) {
            return a[1].reduce(function (sum, obj) {
                    return sum + obj.value;
                }, 0) - b[1].reduce(function (sum, obj) {
                    return sum + obj.value;
                }, 0);
        } : function(a, b) {
            return b[1].reduce(function (sum, obj) {
                    return sum + obj.value;
                }, 0) - a[1].reduce(function (sum, obj) {
                    return sum + obj.value;
                }, 0);
        })
        .map(function (d) {
            return d[0];
        });

    // Copy-on-write since tweens are evaluated after a delay.
    var y0 = d3.scale.ordinal()
        .rangeRoundBands([0, this._innerHeight], this._padding)
        .domain(newCategories)
        .copy();

    var delay = function(d, i, j) { return j * 50; };

    this._bars.transition()
        .duration(750)
        .delay(delay)
        .attr("y", function(d, i, j) { return y0(self._categories[j]); });

    this._categories = newCategories;

    this._yAxisContainer.transition()
        .duration(750)
        .call(self.getYAxis())
        .selectAll("g")
        .delay(delay);

    this._categories = originalCategories; // simple fix
};


HorizontalBarChart.prototype.getXScale = function() {

    return this._xScale = d3.scale.linear()
        .range([0, this._innerWidth])
        .domain([0, this.getMaxValue()]);
};


HorizontalBarChart.prototype.getXAxis = function() {

    return d3.svg.axis()
        .scale(this.getXScale())
        .orient('bottom')
        .tickFormat(this.getValueFormatter());
};


HorizontalBarChart.prototype.getXAxisTransform = function() {

    return 'translate(0, ' + this._innerHeight + ')';
};


HorizontalBarChart.prototype.getYScale = function() {

    return this._yScale = d3.scale.ordinal()
        .rangeBands([0, this._innerHeight], this._padding)
        .domain(this._categories);
};


HorizontalBarChart.prototype.getYAxis = function() {

    return d3.svg.axis()
        .scale(this.getYScale())
        .tickFormat(function(d) {
            var maxlength = 10;
            if (d.length > maxlength) {
                d = d.substring(0, maxlength) + '…'; // \u8230
            }
            return d;
        })
        .orient('left');
};


HorizontalBarChart.prototype.getYAxisTransform = function() {

    return 'translate(0, 0)';
};


HorizontalBarChart.prototype.getBarHeight = function(d, i, j) {

    return this._yScale.rangeBand();
};


HorizontalBarChart.prototype.getBarWidth = function(d, i, j) {

    return this._xScale(d.value);
};


HorizontalBarChart.prototype.getBarX = function(d, i, j) {

    var x = 0;

    for (var k = 0; k < i; k ++) {
        x += this._xScale(this._chartData[j][k].value);
    }

    return x;
};


HorizontalBarChart.prototype.getBarY = function(d, i, j) {

    return this._yScale(this._categories[j]);
};
