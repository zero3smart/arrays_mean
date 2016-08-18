describe('GroupingAlgorithm', function() {

    var xTicks = [3, 6, 9];
    var yTicks = [2, 4, 6];

    var xValues = [];
    var yValues = [];

    var densityMatrix = new GroupingAlgorithm()
        .setUp(xValues, xTicks, yValues, yTicks)
        .execute();

    console.log(densityMatrix);

    it('should be able to play a Ok', function() {
        var is = true;
        expect(is).toEqual(true);
    });
});