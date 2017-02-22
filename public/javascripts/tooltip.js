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
    this._offset = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 5
    };
    /**
     * Tooltip prefered position.
     * @private
     * @member {'top'|'right'|'bottom'|'left'}
     */
    this._position = 'left';
    /**
     *
     */
    this._element = undefined;
    /**
     *
     */
    this._width = undefined;
}


Tooltip.prototype.setWidth = function (width) {

    this._width = width;
    return this;
};


Tooltip.prototype.getWidth = function (deafultWidth) {

    if (this._width) {
        return this._width;
    } else {
        return deafultWidth;
    }
};


/**
 * Set tooltip position.
 * @public
 * @param {'top'|'right'|'bottom'|'left'} position
 * @returns {Tooltip}
 */
Tooltip.prototype.setPosition = function (position) {

    this._position = position;
    return this;
};


/**
 * Hide tooltip.
 * @public
 * @returns {Tooltip}
 */
Tooltip.prototype.hide = function () {

    if (this._container && this._container.size() > 0) {
        this._container.remove();
        this._container = undefined;
    }

    return this;
};


/**
 * Set offset.
 * @public
 * @param {Object|Integer} offset
 * @param {Integer} [value]
 * @returns {Tooltip}
 */
Tooltip.prototype.setOffset = function (offset, value) {

    if (offset instanceof Object) {
        for (i in offset) {
            this._offset[i] = offset[i];
        }
    } else {
        this._offset[offset] = value;
    }

    return this;
};


/**
 * Set content.
 * @public
 * @param {String} content
 * @returns {Tooltip}
 */
Tooltip.prototype.setContent = function (content) {

    this._content = content;
    return this;
};


/**
 * Append hidden tooltip container to the document body.
 * @param element
 * @returns {Tooltip}
 */
Tooltip.prototype.setOn = function (element, cls) {
    /*
     * Stash current element.
     */
    this._element = element;
    if (!cls) cls = '';
    /*
     * Append tooltip container to the document body.
     */
    if (!this._container) {
        this._container = d3.select(document.body).append('div')
            .attr('class', 'arrays-co-tooltip ' + cls)
            .style('background-color', '#fff');
    }

    return this;
};


/**
 * Show tooltip.
 * @param {HTMLElement|SVGElement} element
 * @returns {Tooltip}
 */
Tooltip.prototype.show = function (element, options) {
    options = options || {};
    
    var elementDimensions, position;
    
    /*
     * Use previously stashed element if not prvided.
     */
    element = element || this._element;
    /*
     * Stash current element.
     */
    this.setOn(element);
    
    if (options.bounds) {
        // We're expecting options.bounds to have top, left, width, height
        elementDimensions = options.bounds;
        position = {
            left: options.bounds.left,
            top: options.bounds.top
        };
    } else {
        /*
        * Get element dimensions.
        */
        elementDimensions = element.getBoundingClientRect();
        /*
        * Get element position.
        */
        position = jQuery(element).offset();
    }
    
    /*
     * Append hidden content to the container.
     */
    this._container.html(this._content);
    /*
     * Set up width if defined.
     */
    var width = this.getWidth();
    if (width) {
        this._container.style('width', width + 'px');
    }
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
Tooltip.prototype._getLeftPosition = function (position, tooltipDimension, elementDimensions) {
    /*
     * Evaluate tooltip x and y positions.
     */
    var x = position.left - tooltipDimension.width + this._offset.right - this._offset.left;
    var y = position.top - this._offset.top;
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
     * Fix document width left violence.
     */
    if (x < 0) {
        x = position.left + elementDimensions.width + this._offset.left;
    }

    return {
        'x': x,
        'y': y
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
Tooltip.prototype._getTopPosition = function (position, tooltipDimension, elementDimensions) {
    /*
     * Evaluate tooltip x and y positions.
     */
    var x = position.left - tooltipDimension.width / 2 + elementDimensions.width / 2;
    var y = position.top - tooltipDimension.height - this._offset.left;
    /*
     * Show tooltip at the bottom if y < 0 (beyond window top border).
     */
    if (y < 0) {
        y = position.top + elementDimensions.height + this._offset.left;
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
        'x': x,
        'y': y
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
Tooltip.prototype._getRightPosition = function (position, tooltipDimension, elementDimensions) {
    /*
     * Evaluate tooltip x and y positions.
     */
    var x = position.left + elementDimensions.width + this._offset.right - this._offset.left;
    var y = position.top - this._offset.top;
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
     * Fix document right left violence.
     */
    if (x + tooltipDimension.width > document.body.clientWidth) {
        x = document.body.clientWidth - tooltipDimension.width;
    }

    return {
        'x': x,
        'y': y
    };

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
Tooltip.prototype._getBottomPosition = function (position, tooltipDimension, elementDimensions) {

    throw new Error('Tooltip#_getBottomPosition not implemented');
};
