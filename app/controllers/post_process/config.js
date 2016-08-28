var constructor = function() {
    var self = this;
    self.pageSize = 200;
    self.timelineGroupSize = 20;
    self.timelineGroups = this.pageSize / this.timelineGroupSize * 2;
    self.defaultFormat = "MMMM Do, YYYY";

    return self;
};

module.exports = constructor;