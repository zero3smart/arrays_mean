/**
 * Scatterplot view abstract class.
 * @public
 * @constructor
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
 * @param {Object[]} data
 */
scatterplot.view.main.prototype.render = function(data) {

    throw new Error('scatterplot.view#render not implemented!');
};


/**
 * Show tooltip.
 * @public
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