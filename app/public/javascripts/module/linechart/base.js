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
linechart.base.prototype._getXDomain = function(data) {

    data = data || this._data;

    return d3.extent(data.reduce(function(extent, dataSet) {
        return extent.concat(dataSet.map(function(d) {
            return d.date;
        }));
    }, []));
};


/**
 * Get y extent.
 * @private
 * @return {Number[]}
 */
linechart.base.prototype._getYDomain = function(data) {

    data = data || this._data;

    return [0, data.reduce(function(maxValue, dataSet) {
        return Math.max(maxValue, dataSet.length ? d3.max(dataSet.map(function(d) {
            return d.value;
        })) : 0);
    }, 0)];
};