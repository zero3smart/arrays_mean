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
        CountOf_ArtistsWhereCodeIs("Male", function(err, value)
        {
            if (err == null) {
                console.log("💡  There are " + value + " male artists.")
            }
            cb(err, value)
        })
    }
    ,
    function(cb)
    {
        CountOf_ArtistsWhereCodeIs("Female", function(err, value)
        {
            if (err == null) {
                console.log("💡  There are " + value + " female artists.")
            }
            cb(err, value)
        })
    }
    ,
    //
    // // Count after join
    // function(cb)
    // {
    //     CountOf_ArtworksWhere_ArtistCodeIs("Female", function(err, value)
    //     {
    //         if (err == null) {
    //             console.log("💡  There are " + value + " artworks by female artists.")
    //         }
    //         cb(err, value)
    //     })
    // }
]
//
//
////////////////////////////////////////////////////////////////////////////////
// Ask the questions concurrently (switch to .series for serial execution)
//
async.parallel(questionAskingFns, function(err, results)
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
function CountOf_ArtworksWhere_ArtistCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    
    // var artists_rowObjs_collectionName = _Artists_rowObjectsCollectionName()
    // var artworks_rowObjs_collectionName = _Artworks_rowObjectsCollectionName()
    

    var artists_mongooseContext = New_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
    var artists_mongooseModel = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model

    var artworks_mongooseContext = New_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString)
    var artworks_mongooseModel = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model
    
    var aggregationOperators = 
    [
        { // Female artists
            $match: {
                srcDocPKey: artists_srcDoc_primaryKeyString,
                "rowParams.Code": codeValue
            }
        },
        {
            $project: {
                _id: 0,
                Artist: "$rowParams.Artist"
            }
        }
        // ,
        // {
        //     $group: {
        //         Artist: 1
        //     }
        // }
    ]
    rawRowObject_model.aggregate(aggregationOperators).exec(function(err, results)
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
        console.log("results " , results)
    })
    
    // var aggregationOperators =
    // [
    //     { // codeValue Artists
    //         $project: {
    //             dataSrcDocRevPKey: "$srcDocPKey"
    //             , rowPKey: "$pKey"
    //             , Artist: "$rowParams.Artist"
                // , IsArtist: { $eq: [ "$srcDocPKey", artists_srcDoc_primaryKeyString ] }
                // , IsArtwork: { $eq: [ "$srcDocPKey", artworks_srcDoc_primaryKeyString ] }            }
    //     },
    //     {
    //         $match: {
    //             $or: [ // Either
    //                 // { //  Artists,
    //                 //     IsArtist: true
    //                 // }
    //                 // ,
    //                 { // or Artworks
    //                     IsArtwork: true
    //                 }
    //             ]
    //         }
    //     },
    // Now need to merge the fields by artist
    // Then filter where Code is codeValue
    // Then count
    // ]
    // rawRowObject_model
    //     .aggregate(aggregationOperators)
    //     .exec(function(err, results)
    // {
    //     if (err) {
    //         fn(err, null)
    //
    //         return
    //     }
    //     if (results == undefined || results == null
    //         || results.length == 0) {
    //         fn(null, 0)
    //
    //         return
    //     }
    //     var value = results[0].count
    //     fn(err, value)
    // })    
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
    return context.raw_row_objects_controller.New_RowObjectsCollectionName(_Artists_srcDoc_primaryKeyString())
}
function _Artworks_rowObjectsCollectionName()
{
    return context.raw_row_objects_controller.New_RowObjectsCollectionName(_Artworks_srcDoc_primaryKeyString())
}