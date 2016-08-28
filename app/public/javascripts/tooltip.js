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
    /**
     * Tooltip prefered position.
     * @private
     * @member {'top'|'right'|'bottom'|'left'}
     */
    this._position = 'left';
}


/**
 * Set tooltip position.
 * @public
 * @param {'top'|'right'|'bottom'|'left'} position
 * @returns {Tooltip}
 */
Tooltip.prototype.setPosition = function(position) {

    this._position = position;
    return this;
};


/**
 * Hide tooltip.
 * @public
 * @returns {Tooltip}
 */
Tooltip.prototype.hide = function() {

    if (this._container && this._container.size() > 0) {
        this._container.remove();
    }

    return this;
};


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
    var position = jQuery(element).position();
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

    var name = this._position.slice(0, 1).toUpperCase() + this._position.slice(1).toLowerCase();
    var coordinates = this['_get' + name + 'Position'](position, tooltipDimension, elementDimensions);
    /*
     * Set tooltip coordiantes and show.
     */
    this._container.style('top', coordinates.y + 'px')
        .style('left', coordinates.x + 'px')
        .style('visibility', 'visible');

    return this;
};


/**
 * Get tooltip left position coordinates.
 * @private
 * @param {Object} position
 * @param {Number} position.top
 * @param {Number} position.left
 * @param {DOMRect} tooltipDimension
 * @param {DOMRect} elementDimensions
 * @returns {Object}
 */
Tooltip.prototype._getLeftPosition = function(position, tooltipDimension, elementDimensions) {
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

    return {
        'x' : x,
        'y' : y
    };
};


/**
 * Get tooltip top position coordinates.
 * @private
 * @param {Object} position
 * @param {Number} position.top
 * @param {Number} position.left
 * @param {DOMRect} tooltipDimension
 * @param {DOMRect} elementDimensions
 * @returns {Object}
 */
Tooltip.prototype._getTopPosition = function(position, tooltipDimension, elementDimensions) {
    /*
     * Evaluate tooltip x and y positions.
     */
    var x = position.left - tooltipDimension.width / 2 + elementDimensions.width / 2;
    var y = position.top - tooltipDimension.height - this._offset;
    /*
     * Show tooltip at the bottom if y < 0 (beyond window top border).
     */
    if (y < 0) {
        y = position.top + elementDimensions.height + this._offset;
    }
    /*
     * Fix document width left violence.
     */
    if (x < 0) {
        x = 0;
    }
    /*
     * Fix document width right violence.
     */
    if (x + tooltipDimension.width > document.body.clientWidth) {
        x -= x + tooltipDimension.width - document.body.clientWidth;
    }

    return {
        'x' : x,
        'y' : y
    };
};


/**
 * Get tooltip right position coordinates.
 * @private
 * @param {Object} position
 * @param {Number} position.top
 * @param {Number} position.left
 * @param {DOMRect} tooltipDimension
 * @param {DOMRect} elementDimensions
 * @returns {Object}
 */
Tooltip.prototype._getRightPosition = function() {

    throw new Error('Tooltip#_getRightPosition not implemented');
};


/**
 * Get tooltip bottom position coordinates.
 * @private
 * @param {Object} position
 * @param {Number} position.top
 * @param {Number} position.left
 * @param {DOMRect} tooltipDimension
 * @param {DOMRect} elementDimensions
 * @returns {Object}
 */
Tooltip.prototype._getBottomPosition = function() {

    throw new Error('Tooltip#_getBottomPosition not implemented');
};