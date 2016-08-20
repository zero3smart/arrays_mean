/**
 * Line chart common functionality container.
 * @private
 * @class
 */
linechart.base = function() {

}


/**
 * Get x extent.
 * @private
 * @return {Date[]}
 */
linechart.base.prototype._getXDomain = function() {

    return d3.extent(this._data.reduce(function(extent, dataSet) {
        return extent.concat(dataSet.map(function(d) {
            return d.year;
        }));
    }, []));
};


/**
 * Get y extent.
 * @private
 * @return {Number[]}
 */
linechart.base.prototype._getYDomain = function() {

    return [0, this._data.reduce(function(maxValue, dataSet) {
        return Math.max(maxValue, d3.max(dataSet.map(function(d) {
            return d.count;
        })));
    }, 0)];
};