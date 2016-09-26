/**
 * Line focus chart.
 * @constructor
 * @param {Object[]} data
 */
linechart.chart = function(data, redirectBaseUrl) {
    /**
     * Chart data.
     * @private
     * @member {Object[]}
     */
    this._data = data.map(function(series) {
        return series.sort(function(a, b) {
            return a.year - b.year;
        });
    });
    /**
     * Url information to redirect when clicking tick on the x-axis
     */
    this._redirectBaseUrl = redirectBaseUrl;

    /**
     * Chart main part.
     * @private
     * @member {linechart.viewport}
     */
    this._viewport = new linechart.viewport(this._data, this._redirectBaseUrl);
    /**
     * Chart navigation part.
     * @private
     * @member {linechart.navigation}
     */
    this._navigation = new linechart.navigation(this._data, this._viewport);
    /*
     * Set up window resize event handler.
     */
    var self = this;
    d3.select(window).on('resize.line-graph', function() {
        self.resize();
        self.update();
    });
};


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

    this._viewportContainer = this._container.append('div')
        .style('height', '75%');
    this._viewport.render(this._viewportContainer);

    this._navContainer = this._container.append('div')
        .style('height', '25%');
    this._navigation.render(this._navContainer);
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
    /*
     * Change chart's container height. But min height is 400px.
     */
    var height = Math.max(400, window.innerHeight - jQuery(this._container.node()).offset().top);
    this._container.style('height', height + 'px');
    /*
     * Run each subchart resize procedure.
     */
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

    this._viewport.update(data);
    this._navigation.update(data);

    return this;
};