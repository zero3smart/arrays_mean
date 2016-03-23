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
const artistsSrcDocUID = "MoMA_Artists_v1_jy.csv"
const artistsSrcDocRevNumber = 1
const artworksSrcDocUID = "MoMA_Artworks CSV"
const artworksSrcDocRevNumber = 2
//
//
////////////////////////////////////////////////////////////////////////////////
// Ask questions...
//
var questionAskingFns =
[
    function(cb) 
    {
        CountOf_ArtworksWhere_ArtistCodeIs("Female", function(err, value)
        {
            console.log("💬  Count of artworks by female artists:", value)
            cb(err, value)
        })
    },
    function(cb)
    {
        cb(null, null)
    }
]
async.parallel(questionAskingFns, function(err, results)
{
    if (err) {
        console.error("❌  Error encountered:", err)
    } else {
        console.log("✅  Finished:", results)
    }
})
//
//
////////////////////////////////////////////////////////////////////////////////
// Question implementations - Returning Single Value
//
function CountOf_ArtworksWhere_ArtistCodeIs(codeValue, fn)
{
    var artists_srcDoc_primaryKeyString = _Artists_srcDoc_primaryKeyString()
    var artworks_srcDoc_primaryKeyString = _Artworks_srcDoc_primaryKeyString()
    
    var rawRowObject_model = context.raw_row_objects_controller.Model
    
    var aggregationOperators = 
    [
        {
            $match: {
                dataSourceDocumentRevisionKey: artists_srcDoc_primaryKeyString
            }
        },
        {
            $match: {
                "rowParameters.Code": codeValue
            }
        }
        // { // All artworks
        //     $match: {
        //         dataSourceDocumentRevisionKey: artworks_srcDoc_primaryKeyString
        //     }
        // },
        // { // Join in "Code" (Gender) from Artists
        //     $lookup: {
        //         from:
        //     }
        // },
        // {
        //     $match: {
        //         Code: codeValue
        //     }
        // }
    ]
    var grouping = 
    { 
        _id: null,
        count: { $sum: 1 }
    }
    rawRowObject_model
        .aggregate(aggregationOperators)
        .group(grouping)
        .exec(function(err, result)
    {
        if (err) {
            fn(err, null)            
            
            return
        } 
        var value = result
        console.log("value", value)
        fn(err, value)
    })    
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