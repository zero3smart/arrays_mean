$(function () {

    /*
     A: 1
     R: 2
     R: 3
     A: 4
     Y: 5
     S: 6
     */

    var letter_1 = [];
    letter_1[0] = "/images/letters/letters_a1.png";
    letter_1[1] = "/images/letters/letters_a2.png";
    letter_1[2] = "/images/letters/letters_a3.png";
    letter_1[3] = "/images/letters/letters_a4.png";
    letter_1[4] = "/images/letters/letters_a5.png";
    letter_1[5] = "/images/letters/letters_a6.png";
    letter_1[6] = "/images/letters/letters_a7.png";
    letter_1[7] = "/images/letters/letters_a8.png";

    var letter_2 = [];
    letter_2[0] = "/images/letters/letters_r1.png";
    letter_2[1] = "/images/letters/letters_r2.png";
    letter_2[2] = "/images/letters/letters_r3.png";
    letter_2[3] = "/images/letters/letters_r4.png";
    letter_2[4] = "/images/letters/letters_r5.png";
    letter_2[5] = "/images/letters/letters_r6.png";
    letter_2[6] = "/images/letters/letters_r7.png";
    letter_2[7] = "/images/letters/letters_r8.png";

    var letter_3 = [];
    letter_3[0] = "/images/letters/letters_r1.png";
    letter_3[1] = "/images/letters/letters_r2.png";
    letter_3[2] = "/images/letters/letters_r3.png";
    letter_3[3] = "/images/letters/letters_r4.png";
    letter_3[4] = "/images/letters/letters_r5.png";
    letter_3[5] = "/images/letters/letters_r6.png";
    letter_3[6] = "/images/letters/letters_r7.png";
    letter_3[7] = "/images/letters/letters_r8.png";

    var letter_4 = [];
    letter_4[0] = "/images/letters/letters_a1.png";
    letter_4[1] = "/images/letters/letters_a2.png";
    letter_4[2] = "/images/letters/letters_a3.png";
    letter_4[3] = "/images/letters/letters_a4.png";
    letter_4[4] = "/images/letters/letters_a5.png";
    letter_4[5] = "/images/letters/letters_a6.png";
    letter_4[6] = "/images/letters/letters_a7.png";
    letter_4[7] = "/images/letters/letters_a8.png";

    var letter_5 = [];
    letter_5[0] = "/images/letters/letters_y1.png";
    letter_5[1] = "/images/letters/letters_y2.png";
    letter_5[2] = "/images/letters/letters_y3.png";
    letter_5[3] = "/images/letters/letters_y4.png";
    letter_5[4] = "/images/letters/letters_y5.png";
    letter_5[5] = "/images/letters/letters_y6.png";
    letter_5[6] = "/images/letters/letters_y7.png";
    letter_5[7] = "/images/letters/letters_y8.png";

    var letter_6 = [];
    letter_6[0] = "/images/letters/letters_s1.png";
    letter_6[1] = "/images/letters/letters_s2.png";
    letter_6[2] = "/images/letters/letters_s3.png";
    letter_6[3] = "/images/letters/letters_s4.png";
    letter_6[4] = "/images/letters/letters_s5.png";
    letter_6[5] = "/images/letters/letters_s6.png";
    letter_6[6] = "/images/letters/letters_s7.png";
    letter_6[7] = "/images/letters/letters_s8.png";


    var loop = setInterval(function () {
        swapImage("#letter_1", letter_1);
        swapImage("#letter_2", letter_2);
        swapImage("#letter_3", letter_3);
        swapImage("#letter_4", letter_4);
        swapImage("#letter_5", letter_5);
        swapImage("#letter_6", letter_6);
    }, 1000);

    function swapImage(id, letter_array) {
        var shape = Math.floor(Math.random() * 2); // 50% change to get a shape or letter
        var r = 0;
        if (shape !== 0) {
            r = Math.floor(Math.random() * (letter_array.length) + 1);
        }
        var src = letter_array[r];
        $(id).attr("src", src);
    }

});