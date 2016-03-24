//
//
const async = require('async')
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
    // Count on matching rows of single source doc 
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
    }
    ,
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
    
    
    function(cb)
    {
        console.log("------------------------------------------")
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_Artworks(function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()))
            if (err == null) {
                console.log("💡  There are " + value + " artworks.")
            }
            cb(err, value)
        })
    },
    
    

    // Count after join
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
        console.log("⏱  Started at " + (new Date().toString()))
        CountOf_ArtworksWhere_ArtistCodeIs("Male", function(err, value)
        {
            console.log("⏱  Finished at " + (new Date().toString()))
            if (err == null) {
                console.log("💡  There are " + value + " artworks by male artists.")
            }
            cb(err, value)
        })
    }
]
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
    
    var artists_mongooseContext = context.raw_row_objects_controller.New_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
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

    var artworks_mongooseContext = context.raw_row_objects_controller.New_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
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
function CountOf_ArtworksWhere_ArtistCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()

    var artists_mongooseContext = context.raw_row_objects_controller.New_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
    var artists_mongooseModel = artists_mongooseContext.forThisDataSource_RawRowObject_model

    var artworks_mongooseContext = context.raw_row_objects_controller.New_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString)
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model

    var artists_rowObjs_collectionName = _Artists_rowObjectsCollectionName()
    var artworks_rowObjs_collectionName = _Artworks_rowObjectsCollectionName()
    // console.log("Left-join artworks from " , artworks_rowObjs_collectionName)
    
    var aggregationOperators =
    [
        // { // Code:codeValue artists
        //     $match: {
        //         "rowParams.Code": codeValue
        //     }
        // },
        // { // Now join with artworks where artistname is the same
        //     $lookup: {
        //         from: artworks_rowObjs_collectionName,
        //         localField: "rowParams.Artist",
        //         foreignField: "rowParams.Artist",
        //         as: "artworks"
        //     }
        // },
        //
        // // I: Slow
        // // { // Flatten
        // //     $unwind: {
        // //         path: "$artworks"
        // //     }
        // // },
        // // { // Then $group to count
        // //     $group: {
        // //         _id: 1,
        // //         count: {
        // //             $sum: 1
        // //         }
        // //     }
        // // }
        //
        // // II: Faster?
        // {
        //     $project: {
        //         _id: 1,
        //         rowsCoun: {
        //             $size: "$artworks"
        //         }
        //      }
        // },
        // {
        //     $group: {
        //         _id: 1,
        //         count: { $sum: "$count" }
        //     }
        // }
        
        
        
        // OBSERVATION: Using the large dataset's Model and doing the aggregate there
        // is much faster than pulling in the large dataset with a join
        // {
        //     $lookup: {
        //         from: artists_rowObjs_collectionName,
        //         localField: "rowParams.Artist",
        //         foreignField: "rowParams.Artist",
        //         as: "artist"
        //     }
        // },
        // {
        //     $unwind: {
        //         path: "$artist"
        //     }
        // },
        // { // Trim down the object
        //     $project: {
        //         _id: 1,
        //         // a: "$rowParams.Artist",
        //         // b: "$rowParams.Title",
        //         c: "$artist.rowParams.Code"
        //     }
        // },
        // { // filter to Code:codeValue artists
        //     $match: {
        //         "c": codeValue
        //     }
        // },
        // { // Count
        //     $group: {
        //         _id: 1,
        //         count: { $sum: 1 }
        //     }
        // }
        //        
        //
        // A slightly simpler, maybe faster method:        
        //
        { // Join
            $lookup: {
                from: artists_rowObjs_collectionName,
                localField: "rowParams.Artist",
                foreignField: "rowParams.Artist",
                as: "artist"
            }
        },
        { // Flatten
            $unwind: {
                path: "$artist"
            }
        },
        { // Filter
            $match: {
                "artist.rowParams.Code": codeValue
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

    artworks_mongooseModel.aggregate(aggregationOperators).exec(doneFn)    
}
//
//
////////////////////////////////////////////////////////////////////////////////
// Questions implementations - Returning List of Values
//

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