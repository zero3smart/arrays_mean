// Hydrate context
var context_object_instantiation_descriptions = 
[ 
    {
        module_path: __dirname + "/import_controller",
        instance_key: "import_controller",
        options: {}
    },
    {
        module_path: __dirname + "/../raw_objects/raw_string_documents",
        instance_key: "raw_string_documents_controller",
        options: {}
    },
    {
        module_path: __dirname + "/../raw_objects/raw_row_objects",
        instance_key: "raw_row_objects_controller",
        options: {}
    }
]
function NewHydratedContext() 
{
    var initialContext = {}
    
    return require("../runtime_utils/runtime-context").NewHydratedContext(context_object_instantiation_descriptions, initialContext)
}
module.exports.NewHydratedContext = NewHydratedContext