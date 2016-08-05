/**
 * @constructor
 * @param {Object[]} data
 */
linechart.chart = function(data) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data;
    /**
     * 
     */
    this._viewport = new linechart.viewport(this._data);
    /**
     * 
     */
    this._navigation = new linechart.navigation(this._data);
}


/**
 * Render chart.
 * @public
 * @param {String} selector
 * @returns {linechart.chart}
 */
linechart.chart.prototype.render = function(selector) {
    /*
     * Select chart container.
     */
    this._container = d3.select(selector);
    /*
     * Check container is founded by provided selector.
     */
    if (this._container.size() === 0) {
        throw new Error('Cannot find HTML element by "' + selector + '" selector');
    }

    this._container.style('height', '400px');

    var container = this._container.append('div')
        .style('height', '75%');
    this._viewport.render(container);

    container = this._container.append('div')
        .style('height', '25%');
    this._navigation.render(container);
    /*
     * Set up chart size.
     */
    this.resize();
    /*
     * Populate with data.
     */
    this.update();

    return this;
};


/**
 * Resize chart.
 * @public
 * @returns {linechart.chart}
 */
linechart.chart.prototype.resize = function() {

    this._viewport.resize();
    this._navigation.resize();

    return this;
};


/**
 * Update chart.
 * @public
 * @param {Object[]} [data]
 * @returns {linechart.chart}
 */
linechart.chart.prototype.update = function(data) {
    /*
     * Use current data if not provided.
     */
    data = data || this._data;

    this._viewport.update(data);
    this._navigation.update(data);

    return this;
};