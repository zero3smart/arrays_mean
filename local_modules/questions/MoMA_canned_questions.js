//
//
const async = require('async')
const moment = require('moment')
const mongoose_client = require('../mongoose_client/mongoose_client')
//
//
////////////////////////////////////////////////////////////////////////////////
// Set up application runtime object graph
//
var context = require('./canned_questions_context').NewHydratedContext() 
const MoMA_question_implementations = require('./MoMA_canned_question_implementations')
//
//
////////////////////////////////////////////////////////////////////////////////
// Define constants
//
const artistsSrcDocUID = "MoMA_Artists_v1_jy.csv"
const artistsSrcDocRevNumber = 1
const artworksSrcDocUID = "MoMA_Artworks CSV"
const artworksSrcDocRevNumber = 2

//
//
////////////////////////////////////////////////////////////////////////////////
// Specify the questions
//
var questionAskingFns =
[
    //
    //
    // Count of all artists
    //
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_Artists(function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " artists in the Artists collection.")
            }
            cb(err, value)
        })
    },
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_UniqueArtistsOfArtworks(function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " unique artists in the Artworks collection.")
            }
            cb(err, value)
        })
    },
    //
    //
    // Count artists by gender
    //
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_ArtistsWhereCodeIs("Male", function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " male artists in the Artists collection.")
            }
            cb(err, value)
        })
    },
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_ArtistsWhereCodeIs("Female", function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " female artists in the Artists collection.")
            }
            cb(err, value)
        })
    },
    //
    //
    // Count all artworks
    //
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_Artworks(function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " artworks total.")
            }
            cb(err, value)
        })
    },
    //
    //
    // Count of artworks by gender
    //
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_ArtworksWhere_ArtistCodeIs("Female", function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " artworks by female artists.")
            }
            cb(err, value)
        })
    },
    function(cb)
    {
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_ArtworksWhere_ArtistCodeIs("Male", function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " artworks by male artists.");
            }
            cb(err, value);
        })
    },
    //
    //
    // Count of artworks in date range
    //
    function(cb)
    {
        var startDate = moment("01/01/1900", "MM/DD/YYYY").toDate();
        var endDate = moment("12/31/1950", "MM/DD/YYYY").toDate();
        
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.CountOf_ArtworksWhere_DateIsInRange(startDate, endDate, function(err, value)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  There are " + value + " artworks between " + startDate.getFullYear() + " and " + endDate.getFullYear() + ".");
            }
            cb(err, value);
        });
    },
    //
    //
    // Predominate art media of art in date range
    //
    function(cb)
    {
        var startDate = moment("01/01/1900", "MM/DD/YYYY").toDate();
        var endDate = moment("12/31/1950", "MM/DD/YYYY").toDate();
        var fieldName = "rowParams.Medium"
        var limitToNResults = 20
        
        
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, function(err, results)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  The " + limitToNResults + " most prevalent " + fieldName + "s of artworks between " + startDate.getFullYear() + " and " + endDate.getFullYear() + " are:\n", results);
            }
            cb(err, results);
        });
    },
    //
    //
    // Most prolific artists of artworks in date range
    //
    function(cb)
    {
        var startDate = moment("01/01/1500", "MM/DD/YYYY").toDate();
        var endDate = moment("12/31/2500", "MM/DD/YYYY").toDate();
        var fieldName = "rowParams.Artist"
        var limitToNResults = 20
        
        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, function(err, results)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  The " + limitToNResults + " " + fieldName + "s with greatest number of artworks between " + startDate.getFullYear() + " and " + endDate.getFullYear() + " are:\n", results);
            }
            cb(err, results);
        });
    },
    //
    //
    // The N artists on page M
    //
    function(cb)
    {
        var fieldName = "rowParams.Artist"
        var pageSize = 20
        var pageNumber = 3
        var skipNResults = pageSize * (Math.max(pageNumber, 1) - 1)
        var limitToNResults = pageSize


        console.log("------------------------------------------")
        var startTime_s = (new Date().getTime())/1000;
        console.log("⏱  Started at\t\t" + startTime_s.toFixed(3) + "s")
        MoMA_question_implementations.FieldValue_OfArtworksWhere(fieldName, skipNResults, limitToNResults, function(err, results)
        {
            var endTime_s = (new Date().getTime())/1000
            var duration_s = endTime_s - startTime_s
            console.log("⏱  Finished at\t\t" + endTime_s.toFixed(3) + "s in " + duration_s.toFixed(4) + "s.")
            if (err == null) {
                console.log("💡  The " + pageSize + " unique " + fieldName +  "s of artworks on query results page " + pageNumber + " are:\n", results);
            }
            cb(err, results);
        });
    }
];
//
//
////////////////////////////////////////////////////////////////////////////////
// Ask the questions concurrently (switch to .series for serial execution)
//
//
mongoose_client.WhenMongoDBConnected(function()
{ // ^ We wait so as not to mess up profiling
    async.series(questionAskingFns, function(err, results)
    {
        if (err) {
            console.error("❌  Error encountered:", err);
            process.exit(1);
        } else {
            console.log("✅  Finished without error.");
            process.exit(0);
        }
    });
});