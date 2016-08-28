describe('GroupingAlgorithm', function() {

    var xTicks = [3, 6, 9];
    var yTicks = [2, 4, 6];

    var xValues = [1, 2, 3, 5, 9];
    var yValues = [1, 2, 4, 5, 6];

    var densityMatrix = new GroupingAlgorithm()
        .setUp(xValues, xTicks, yValues, yTicks)
        .execute();

    console.log(JSON.stringify(densityMatrix));

    it('should be true', function() {
        var is = true;
        expect(is).toEqual(true);
    });
});