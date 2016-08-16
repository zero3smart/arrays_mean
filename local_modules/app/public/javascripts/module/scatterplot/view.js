/**
 * Scatterplot view abstract class.
 * @public
 * @abstract
 * @class
 */
scatterplot.view.main = function(chart) {
    /**
     * Scatterplot instance.
     * @private
     * @member {scatterplot.chart}
     */
    this._chart = chart;
    /**
     * Chart tooltip.
     * @private
     * @member {Tooltip}
     */
    this._tooltip = new Tooltip();
};


/**
 * Render view.
 * @public
 * @abstract
 * @param {Object[]} data
 */
scatterplot.view.main.prototype.render = function(data) {

    throw new Error('scatterplot.view#render not implemented!');
};


/**
 * Get bubbles distrubution matrix.
 * @public
 * @abstract
 * @param {Object[]} data
 * @param {Number[]} xTicks
 * @param {Number[]} yTicks
 * @return {Integer[][]|Object}
 */
scatterplot.view.main.prototype.getDensityMatrix = function(data, xTicks, yTicks) {

    throw new Error('scatterplot.view#getDensityMatrix not implemented!');
};


/**
 * Show tooltip.
 * @public
 * @abstract
 * @param {SVGElement} bubble
 * @param {Object} data
 */
scatterplot.view.main.prototype.showTooltip = function(bubble, data) {

    throw new Error('scatterplot.view#showTooltip not implemented!');
};


/**
 * Hide tooltip.
 * @public
 */
scatterplot.view.main.prototype.hideTooltip = function() {

    this._tooltip.hide();
};