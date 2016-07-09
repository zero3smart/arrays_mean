/**
 * Tooltip component.
 */
function Tooltip() {
    /**
     * Tooltip container.
     * Usually document's body.
     * @private
     * @member {Selection}
     */
    this._container = undefined;
    /**
     * Current content.
     * @private
     * @member {String}
     */
    this._content = '';
    /**
     * X offset.
     * @private
     * @param {Integer}
     */
    this._offset = 5;
};


/**
 * Hide tooltip.
 * @public
 */
Tooltip.prototype.hide = function() {

    if (this._container && this._container.size() > 0) {
        this._container.remove();
    }

    return this;
}


/**
 * Set offset.
 * @public
 * @param {Integer} offset
 * @returns {Tooltip}
 */
Tooltip.prototype.setOffset = function(offset) {

    this._offset = offset;
    return this;
};


/**
 * Set content.
 * @public
 * @param {String} content
 * @returns {Tooltip}
 */
Tooltip.prototype.setContent = function(content) {

    this._content = content;
    return this;
};


/**
 * Show tooltip.
 * @param {HTMLElement|SVGElement} element
 * @returns {Tooltip}
 */
Tooltip.prototype.show = function(element) {
    /*
     * Get element dimansions.
     */
    var elementDimensions = element.getBoundingClientRect();
    /*
     * Get element position.
     */
    var position = jQuery(element).position()
    /*
     * Append hidden content to the container.
     */
    this._container = d3.select(document.body).append('div')
        .attr('class', 'arrays-co-tooltip')
        .style('background-color', '#fff')
        .html(this._content);
    /*
     * Get tooltip dimensions.
     */
    var tooltipDimension = this._container.node().getBoundingClientRect();
    /*
     * Evaluate tooltip x and y positions.
     */
    var x = position.left - tooltipDimension.width - this._offset;
    var y = position.top;
    /*
     * Fix document height bottom violence.
     */
    if (y + tooltipDimension.height > document.body.clientHeight) {
        y -= y + tooltipDimension.height - document.body.clientHeight;
    }
    /*
     * Fix document height top violence. 
     */
    if (y < 0) {
        y = 0;
    }
    /*
     * 
     */
    //if (x + tooltipDimension.width > document.body.clientWidth) {
    //    x = position.left + elementDimensions.width;
    //}
    /*
     * Fix document width left violence.
     */
    if (x < 0) {
        x = position.left + elementDimensions.width + this._offset;
    }
    /*
     * Set tooltip coordiantes and show.
     */
    this._container.style('top', y + 'px')
        .style('left', x + 'px')
        .style('visibility', 'visible');

    return this;
};