var constructor = function() {
    var self = this;
    self.pageSize = 200;
    self.timelineGroupSize = 20;
    self.timelineGroups = this.pageSize / this.timelineGroupSize * 2;
    self.defaultDateFormat = "MMMM Do, YYYY";

    self.AggregateByDefaultColumnName = "NUMBER OF RECORDS";

    return self;
};

module.exports = constructor;