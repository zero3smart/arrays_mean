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
        CountOf_Artists(function(err, value)
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
        CountOf_UniqueArtistsOfArtworks(function(err, value)
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
        CountOf_ArtistsWhereCodeIs("Male", function(err, value)
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
        CountOf_ArtistsWhereCodeIs("Female", function(err, value)
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
        CountOf_Artworks(function(err, value)
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
        CountOf_ArtworksWhere_ArtistCodeIs("Female", function(err, value)
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
        CountOf_ArtworksWhere_ArtistCodeIs("Male", function(err, value)
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
        CountOf_ArtworksWhere_DateIsInRange(startDate, endDate, function(err, value)
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
        FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, function(err, results)
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
        FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, function(err, results)
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
        FieldValue_OfArtworksWhere(fieldName, skipNResults, limitToNResults, function(err, results)
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
//
//
////////////////////////////////////////////////////////////////////////////////
// Question implementations - Returning Single Value
//
function CountOf_ArtistsWhereCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    
    var artists_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
    var artists_mongooseModel = artists_mongooseContext.forThisDataSource_RawRowObject_model

    var aggregationOperators = 
    [
        {
            $match: {
                srcDocPKey: artists_srcDoc_primaryKeyString,
                "rowParams.Code": codeValue
            }
        }
    ]
    var grouping = 
    { 
        _id: null,
        count: { $sum: 1 }
    }
    artists_mongooseModel
        .aggregate(aggregationOperators)
        .group(grouping)
        .exec(function(err, results)
    {
        if (err) {
            fn(err, null)            
            
            return
        } 
        var value = results[0].count
        fn(err, value)
    })    
}
function CountOf_Artworks(fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()

    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    
    var aggregationOperators =
    [
        {
            $group: {
                _id: 1,
                count: { $sum: 1 }
            }
        }
    ]
    artworks_mongooseModel
        .aggregate(aggregationOperators)
        .exec(function(err, results)
    {
        if (err) {
            fn(err, null)

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0)

            return
        }
        // console.log("results " , results)
        var value = results[0].count
        fn(err, value)
    })
}
function CountOf_Artists(fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()

    var artists_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
    var artists_mongooseModel = artists_mongooseContext.forThisDataSource_RawRowObject_model
    
    var aggregationOperators =
    [
        {
            $group: {
                _id: 1,
                count: { $sum: 1 }
            }
        }
    ]
    artists_mongooseModel
        .aggregate(aggregationOperators)
        .exec(function(err, results)
    {
        if (err) {
            fn(err, null)

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0)

            return
        }
        // console.log("results " , results)
        var value = results[0].count
        fn(err, value)
    })
}
function CountOf_UniqueArtistsOfArtworks(fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    //
    var artworks_mongooseScheme = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme
    artworks_mongooseScheme.index({ "rowParams.Artist": 1 }, { unique: false })
    //
    var aggregationOperators =
    [
        { // Group by unique artist names
            $group: {
                _id: "$rowParams.Artist"
            }
        },
        { // Count
            $group: {
                _id: 1,
                count: { $sum: 1 }
            }
        }
    ]
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null)

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0)

            return
        }
        // console.log("results " , results)
        var value = results[0].count
        fn(err, value)
    }
    // var aggregate = artists_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
}

function FieldValuesOf_RowObjectsInSrcDoc_WhereFieldValueIs(mapValuesOfFieldNamed, inSrcDoc_primaryKeyString, match_fieldPath, match_fieldValue, fn)
{
    var collection_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(inSrcDoc_primaryKeyString)
    var collection_mongooseModel = collection_mongooseContext.forThisDataSource_RawRowObject_model
    var collection_mongooseScheme = collection_mongooseContext.forThisDataSource_RawRowObject_scheme
    //
    var filterOperator = { $match: {} }
    filterOperator["$match"]["" + match_fieldPath] = match_fieldValue
    //
    var stripOperator = 
    {
        $project: {
            _id: 0,
            "V" : ("$" + mapValuesOfFieldNamed)
        }
    }
    //
    var aggregationOperators =
    [
        filterOperator,
        stripOperator        
    ];
    //
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null);

            return;
        }
        if (results == undefined || results == null || results.length == 0) {
            fn(null, []);

            return;
        }
        // Now map results into list of flat values
        var values = results.map(function(el)
        {
            return el.V;
        });
        // console.log("values " , values)
        fn(err, values)
    }
    // todo: use a cursor?
    // var aggregate = artists_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    collection_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
}

function CountOf_ArtworksWhere_ArtistCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()

    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    var artworks_mongooseScheme = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme
    artworks_mongooseScheme.index({ "rowParams.Artist": 1 }, { unique: false })

    FieldValuesOf_RowObjectsInSrcDoc_WhereFieldValueIs("rowParams.Artist", artists_srcDoc_primaryKeyString, "rowParams.Code", codeValue, function(err, values)
    {
        if (err) {
            fn(err, null)

            return
        }
        var codeValue_artistNames = values;        
        var aggregationOperators =
        [
            { // Filter
                $match: {
                    // "c": codeValue
                    "rowParams.Artist": { $in: codeValue_artistNames }
                }
            },
            {
                $project: {
                    _id: 1
                }
            },
            { // Count
                $group: {
                    _id: 1,
                    count: { $sum: 1 }
                }
            }
        ];
        var doneFn = function(err, results)
        {
            if (err) {
                fn(err, null);

                return;
            }
            if (results == undefined || results == null
                || results.length == 0) {
                fn(null, 0);

                return;
            }
            // console.log("results " , results)
            var value = results[0].count;
            fn(err, value);
        }
        // var aggregate = artists_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
        // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
        // cursor.each(doneFn)
        artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
    });    
}
//
function CountOf_ArtworksWhere_DateIsInRange(startDate, endDate, fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    //
    var aggregationOperators =
    [
        { // Filter
            $project: {
                withinRange: {
                    $and: [
                        { $gte: [ "$rowParams.Date", startDate ] },
                        { $lte: [ "$rowParams.Date", endDate ] }
                    ]
                }
            }
        },
        {
            $match: {
                withinRange: true
            }
        },
        { // Count
            $group: {
                _id: 1,
                count: { $sum: 1 }
            }
        }        
    ]
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null)

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0)

            return
        }
        // console.log("results " , results)
        var value = results[0].count
        fn(err, value)
    }
    // var aggregate = artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
}
//
//
////////////////////////////////////////////////////////////////////////////////
// Questions implementations - Returning List of Values
//
function FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    //
    var aggregationOperators =
    [
        { // Filter
            $project: {
                withinRange: {
                    $and: [
                        { $gte: [ "$rowParams.Date", startDate ] },
                        { $lte: [ "$rowParams.Date", endDate ] }
                    ]
                },
                F: ("$" + fieldName)
            }
        },
        {
            $match: {
                withinRange: true
            }
        },
        { // Condense all unique fieldName rows into one row while counting number of rows condensed
            $group: {
                _id: "$F",
                c: { $sum: 1 }
            }
        },
        { // Remove rows with empty fieldName value ""…… maybe this should be exposed as an arg somehow
            $redact: {
                $cond: {
                  if: { $eq: [ "$_id", '' ] },
                  then: "$$PRUNE",
                  else: "$$DESCEND"
                }
            }
        }, 
        { // Sort by fieldName value rows which appear most often 
            $sort: {
                c: -1
            }
        },
        { // Finally, limit to top N
            $limit: limitToNResults
        }
    ]
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null)

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0)

            return
        }
        // console.log("results " , results)
        fn(err, results)
    }
    // var aggregate = artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
}

function FieldValue_OfArtworksWhere(fieldName, skipNResults, limitToNResults, fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    //
    var aggregationOperators =
    [
        { // Filter
            $project: {
                F: ("$" + fieldName)
            }
        },
        { // Condense all unique fieldName rows into one row 
            $group: {
                _id: "$F"
            }
        },
        {
            $skip: skipNResults
        },
        { // Finally, limit to top N
            $limit: limitToNResults
        }
    ]
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null)

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0)

            return
        }
        // console.log("results " , results)
        fn(err, results)
    }
    // var aggregate = artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
}
//
//
// Questions - Shared
//
function _Artists_srcDoc_primaryKeyString()
{
    return context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(artistsSrcDocUID, 
                                                                                           artistsSrcDocRevNumber)
}
function _Artworks_srcDoc_primaryKeyString()
{
    return context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(artworksSrcDocUID, 
                                                                                           artworksSrcDocRevNumber)
}
function _Artists_rowObjectsCollectionName()
{
    return context.raw_row_objects_controller.New_RowObjectsModelName(_Artists_srcDoc_primaryKeyString()).toLowerCase()
}
function _Artworks_rowObjectsCollectionName()
{
    return context.raw_row_objects_controller.New_RowObjectsModelName(_Artworks_srcDoc_primaryKeyString()).toLowerCase()
}