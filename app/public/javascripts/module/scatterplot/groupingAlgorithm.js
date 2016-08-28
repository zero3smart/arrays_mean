/**
 * @public
 * @class
 */
function GroupingAlgorithm() {

};


/**
 * Get value interval index.
 * @private
 * @param {Number} value
 * @param {Numbers} intervals
 * @returns {Integer}
 */
GroupingAlgorithm.prototype._getGroupIndex = function(value, intervals) {
    /*
     * Define group number/counter.
     */
    var i;
    /*
     * Define first interval left and right border.
     */
    var right;
    var left = 0;
    /*
     * Get interval's max value.
     */
    var max = d3.max(intervals);
    /*
     * Loop through interval and find value group number.
     */
    for (i = 0; i < intervals.length; i ++) {
        /*
         * Get interval right border.
         */
        right = intervals[i];
        /*
         * Check value within interval.
         */
        if (value == max && value >= left && value <= right) {
            break;
        } else if (value >= left && value < right) {
            break;
        }
        /*
         * Update left border.
         */
        left = right;
    }

    return i;
};


/**
 * Set up algorithm variables.
 * @public
 * @param {Number} xValues
 * @param {Number} xTicks
 * @param {Number} yValues
 * @param {Number} yTicks
 * @return {GroupingAlgorithm}
 */
GroupingAlgorithm.prototype.setUp = function(xValues, xTicks, yValues, yTicks) {

    this._xValues = xValues;
    this._xTicks = xTicks;
    this._yValues = yValues;
    this._yTicks = yTicks;

    return this;
};


/**
 * Get density matrix.
 * @public
 * @return {Integer[][]}
 */
GroupingAlgorithm.prototype.execute = function() {
    /*
     * Generate density matrix filled with values.
     * The matrix rows and columns equals to the chart's rows and columns number.
     */
    var densityMatrix = this._xTicks.map(function() {
        return Array.apply(null, Array(this._yTicks.length)).map(Number.prototype.valueOf, 0);
    }, this);
    /*
     * Populate density matrix.
     */
    this._xValues.forEach(function(d, i) {
        /*
         * Get x and y values of the data point.
         */
        var x = this._xValues[i];
        var y = this._yValues[i];
        /*
         * Find corresponding x and y indexes within x and y ticks.
         */
        var xIndex = this._getGroupIndex(x, this._xTicks);
        var yIndex = this._yTicks.length - 1 - this._getGroupIndex(y, this._yTicks);
        /*
         * Increment corresponding element of density matrix.
         */
        densityMatrix[xIndex][yIndex] ++;
    }, this);

    return densityMatrix;
};