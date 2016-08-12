// Hydrate context
var context_object_instantiation_descriptions = 
[ 
    {
        module_path: __dirname + "/postimport_caching_controller",
        instance_key: "postimport_caching_controller",
        options: {}
    },
    {
        module_path: __dirname + "/../raw_objects/raw_source_documents_controller",
        instance_key: "raw_source_documents_controller",
        options: {}
    },
    {
        module_path: __dirname + "/../raw_objects/raw_row_objects_controller",
        instance_key: "raw_row_objects_controller",
        options: {}
    },
    {
        module_path: __dirname + "/../processed_objects/processed_row_objects_controller",
        instance_key: "processed_row_objects_controller",
        options: {}
    },
    {
        module_path: __dirname + "/../questions/questions_controller",
        instance_key: "questions_controller",
        options: {}
    },
    {
        module_path: __dirname + "/cache_keywords_controller",
        instance_key: "cache_keywords_controller",
        options: {}
    }
];
function NewHydratedContext() 
{
    var initialContext = {};
    
    return require("../runtime_utils/runtime-context").NewHydratedContext(context_object_instantiation_descriptions, initialContext);
}
module.exports.NewHydratedContext = NewHydratedContext;