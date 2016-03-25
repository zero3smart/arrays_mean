//
//
const async = require('async')
const moment = require('moment')
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
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_Artists(function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()))
            if (err == null) {
                console.log("💡  There are " + value + " artists total.")
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
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_ArtistsWhereCodeIs("Male", function(err, value)
        {
        console.log("⏱  Started at " + (new Date().toString()))
            console.log("⏱  Finished at " + (new Date().toString()))
            if (err == null) {
                console.log("💡  There are " + value + " male artists.")
            }
            cb(err, value)
        })
    },
    function(cb)
    {
        console.log("------------------------------------------")
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_ArtistsWhereCodeIs("Female", function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()))
            if (err == null) {
                console.log("💡  There are " + value + " female artists.")
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
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_Artworks(function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()))
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
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_ArtworksWhere_ArtistCodeIs("Female", function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()))
            if (err == null) {
                console.log("💡  There are " + value + " artworks by female artists.")
            }
            cb(err, value)
        })
    },
    function(cb)
    {
        console.log("------------------------------------------")
        console.log("⏱  Started at " + (new Date().toString()));
        CountOf_ArtworksWhere_ArtistCodeIs("Male", function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()));
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
        
        console.log("------------------------------------------");
        console.log("⏱  Started at " + (new Date().toString()));
        CountOf_ArtworksWhere_DateIsInRange(startDate, endDate, function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()));
            if (err == null) {
                console.log("💡  There are " + value + " artworks between " + startDate.getFullYear() + " and " + endDate.getFullYear() + ".");
            }
            cb(err, value);
        });
    },
    //
    //
    // Predominate art media of art in range
    //
    function(cb)
    {
        var startDate = moment("01/01/1900", "MM/DD/YYYY").toDate();
        var endDate = moment("12/31/1950", "MM/DD/YYYY").toDate();
        var fieldName = "rowParams.Medium"
        var limitToNResults = 20
        
        console.log("------------------------------------------");
        console.log("⏱  Started at " + (new Date().toString()));
        FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, function(err, results)
        {
            console.log("⏱  Finished at " + (new Date().toString()));
            if (err == null) {
                console.log("💡  The " + limitToNResults + " most prevalent " + fieldName + "s of artworks between " + startDate.getFullYear() + " and " + endDate.getFullYear() + " are:\n", results);
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
async.series(questionAskingFns, function(err, results)
{
    if (err) {
        console.error("❌  Error encountered:", err)
        process.exit(1)
    } else {
        console.log("✅  Finished without error.")
        process.exit(0)
    }
})
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
function CountOf_ArtworksWhere_ArtistCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()

    var artists_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
    var artists_mongooseModel = artists_mongooseContext.forThisDataSource_RawRowObject_model
    var artists_mongooseScheme = artists_mongooseContext.forThisDataSource_RawRowObject_scheme
    artists_mongooseScheme.index({ "rowParams.Artist": 1 }, { unique: true })

    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model
    var artworks_mongooseScheme = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme
    artworks_mongooseScheme.index({ "rowParams.Artist": 1 }, { unique: false })

    var artists_rowObjs_collectionName = _Artists_rowObjectsCollectionName()
    var artworks_rowObjs_collectionName = _Artworks_rowObjectsCollectionName()
    // console.log("Left-join artworks from " , artworks_rowObjs_collectionName)
    
    var aggregationOperators =
    [
        { // Filter
            $match: {
                // "c": codeValue
                "rowParams.Code": codeValue
            }
        },
        { // Strip dataset
            $project: {
                "A" : "$rowParams.Artist"
            }
        },
        { // Join
            $lookup: {
                from: artworks_rowObjs_collectionName,
                localField: "A",
                // localField: "rowParams.Artist",
                foreignField: "rowParams.Artist",
                as: "artworks"
            }
        },
        {
            $unwind: {
                path: "$artworks"
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
    artists_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn)
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