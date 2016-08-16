//
//
var moment = require('moment');
//
//
////////////////////////////////////////////////////////////////////////////////
// Set up application runtime object graph
//
var context = require('../../../app_context').NewHydratedContext();
//
//
////////////////////////////////////////////////////////////////////////////////
// Define constants
//
var artistsSrcDocUID = "moma_artists";
var artistsSrcDocRevNumber = 1;
var artworksSrcDocUID = "moma_artworks";
var artworksSrcDocRevNumber = 2;

//
//
////////////////////////////////////////////////////////////////////////////////
// Question implementations - Returning Single Value
//
exports.CountOf_ArtistsWhereCodeIs = CountOf_ArtistsWhereCodeIs;
function CountOf_ArtistsWhereCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString();
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();
    
    var artists_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString);
    var artists_mongooseModel = artists_mongooseContext.forThisDataSource_RawRowObject_model;

    var aggregationOperators = 
    [
        {
            $match: {
                srcDocPKey: artists_srcDoc_primaryKeyString,
                "rowParams.Code": codeValue
            }
        }
    ];
    var grouping = 
    { 
        _id: null,
        count: { $sum: 1 }
    };
    artists_mongooseModel
        .aggregate(aggregationOperators)
        .group(grouping)
        .exec(function(err, results)
    {
        if (err) {
            fn(err, null);
            
            return;
        } 
        var value = results[0].count;
        fn(err, value);
    });    
}
exports.CountOf_Artworks = CountOf_Artworks;
function CountOf_Artworks(fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();

    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString);
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model;
    
    var aggregationOperators =
    [
        {
            $group: {
                _id: 1,
                count: { $sum: 1 }
            }
        }
    ];
    artworks_mongooseModel
        .aggregate(aggregationOperators)
        .exec(function(err, results)
    {
        if (err) {
            fn(err, null);

            return;
        }
        if (results == undefined || results == null || results.length == 0) {
            fn(null, 0);

            return;
        }
        // console.log("results " , results)
        var value = results[0].count;
        fn(err, value);
    });
};
exports.CountOf_Artists = CountOf_Artists;
function CountOf_Artists(fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString();

    var artists_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artists_srcDoc_primaryKeyString);
    var artists_mongooseModel = artists_mongooseContext.forThisDataSource_RawRowObject_model;
    
    var aggregationOperators =
    [
        {
            $group: {
                _id: 1,
                count: { $sum: 1 }
            }
        }
    ];
    artists_mongooseModel
        .aggregate(aggregationOperators)
        .exec(function(err, results)
    {
        if (err) {
            fn(err, null);

            return;
        }
        if (results == undefined || results == null || results.length == 0) {
            fn(null, 0);

            return;
        }
        // console.log("results " , results)
        var value = results[0].count;
        fn(err, value);
    });
}
exports.CountOf_UniqueArtistsOfArtworks = CountOf_UniqueArtistsOfArtworks;
function CountOf_UniqueArtistsOfArtworks(fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString);
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model;
    //
    var artworks_mongooseScheme = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme;
    artworks_mongooseScheme.index({ "rowParams.Artist": 1 }, { unique: false });
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
    ];
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null);

            return;
        }
        if (results == undefined || results == null || results.length == 0) {
            fn(null, 0);

            return;
        }
        // console.log("results " , results)
        var value = results[0].count;
        fn(err, value);
    };
    // var aggregate = artists_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
}
exports.CountOf_ArtworksWhere_ArtistCodeIs = CountOf_ArtworksWhere_ArtistCodeIs;
function CountOf_ArtworksWhere_ArtistCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString();
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();

    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString);
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model;
    var artworks_mongooseScheme = artworks_mongooseContext.forThisDataSource_RawRowObject_scheme;
    artworks_mongooseScheme.index({ "rowParams.Artist": 1 }, { unique: false });

    context.questions_controller.FieldValuesOf_RawRowObjectsInSrcDoc_WhereFieldValueIsExactly("rowParams.Artist", artists_srcDoc_primaryKeyString, "rowParams.Code", codeValue, function(err, values)
    {
        if (err) {
            fn(err, null);

            return;
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
        };
        // var aggregate = artists_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
        // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
        // cursor.each(doneFn)
        artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
    });    
}
//
exports.CountOf_ArtworksWhere_DateIsInRange = CountOf_ArtworksWhere_DateIsInRange;
function CountOf_ArtworksWhere_DateIsInRange(startDate, endDate, fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString);
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model;
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
    ];
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null);

            return
        }
        if (results == undefined || results == null
            || results.length == 0) {
            fn(null, 0);

            return
        }
        // console.log("results " , results)
        var value = results[0].count;
        fn(err, value);
    };
    // var aggregate = artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
}
//
//
////////////////////////////////////////////////////////////////////////////////
// Questions implementations - Returning List of Values
//
exports.FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange = FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange;
function FieldValue_OrderedByIncidence_OfArtworksWhere_DateIsInRange(startDate, endDate, fieldName, limitToNResults, fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString);
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model;
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
    ];
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
    };
    // var aggregate = artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
}

exports.FieldValue_OfArtworksWhere = FieldValue_OfArtworksWhere;
function FieldValue_OfArtworksWhere(fieldName, skipNResults, limitToNResults, fn)
{
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString();
    var artworks_mongooseContext = context.raw_row_objects_controller.Lazy_Shared_RawRowObject_MongooseContext(artworks_srcDoc_primaryKeyString);
    var artworks_mongooseModel = artworks_mongooseContext.forThisDataSource_RawRowObject_model;
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
    ];
    var doneFn = function(err, results)
    {
        if (err) {
            fn(err, null);

            return
        }
        if (results == undefined || results == null || results.length == 0) {
            fn(null, 0);

            return;
        }
        // console.log("results " , results)
        fn(err, results);
    };
    // var aggregate = artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)
    // var cursor = aggregate.cursor({ batchSize: 1000 }).exec();
    // cursor.each(doneFn)
    artworks_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
}
//
//
// Questions - Shared
//
function _Artists_srcDoc_primaryKeyString()
{
    return context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(artistsSrcDocUID, 
                                                                                           artistsSrcDocRevNumber);
}
function _Artworks_srcDoc_primaryKeyString()
{
    return context.raw_source_documents_controller.NewCustomPrimaryKeyStringWithComponents(artworksSrcDocUID, 
                                                                                           artworksSrcDocRevNumber);
}