// Hydrate context
var context_object_instantiation_descriptions = 
[ 
    {
        module_path: __dirname + "/logging",
        instance_key: "logging",
        options: {}
    },
    {
        module_path: __dirname + "/routes",
        instance_key: "routes_controller",
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
        module_path: __dirname + "/API_data_preparation_controller",
        instance_key: "API_data_preparation_controller",
        options: {}
    }
];
function NewHydratedContext(app) 
{
    var initialContext = 
    {
        app: app
    };
    
    return require("../runtime_utils/runtime-context").NewHydratedContext(context_object_instantiation_descriptions, initialContext);
}
module.exports.NewHydratedContext = NewHydratedContext;