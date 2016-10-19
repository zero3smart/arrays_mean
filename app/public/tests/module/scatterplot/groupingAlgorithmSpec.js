describe('GroupingAlgorithm', function () {
    /*
     * Define axes ticks (without) zeroes.
     */
    var xTicks = [3, 6, 9];
    var yTicks = [2, 4, 6];
    /*
     * Define points coordinates (5 points).
     */
    var xValues = [1, 2, 3, 5, 9];
    var yValues = [1, 2, 4, 5, 6];
    /*
     * Run grouping algorithm and get result.
     */
    var densityMatrix = new GroupingAlgorithm()
        .setUp(xValues, xTicks, yValues, yTicks)
        .execute();
    /*
     * Define correct answer.
     */
    var answer = [
        [1, 1, 0], // column 1
        [0, 0, 2], // column 2
        [0, 0, 1]  // column 3
    ];
    /*
     * Run arrays comparison procedure. If arrays equals to each other
     * it will return total size of answer array - it contains 9 elements.
     */
    var size = answer.reduce(function (size, answerColumn, i) {
        var densityColumn = densityMatrix[i];
        return size += answerColumn.filter(function (answerValue, i) {
            return answerValue == densityColumn[i];
        }).length;
    }, 0);
    /*
     * Test values with jasmine.
     */
    it('Check density matrix', function () {
        expect(size).toEqual(9);
    });
});