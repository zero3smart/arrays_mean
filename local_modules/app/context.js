// Hydrate context
var context_object_instantiation_descriptions = 
[ 
    {
        module_path: "./logging",
        instance_key: "logging",
        options: {}
    },
    {
        module_path: "./routes",
        instance_key: "routes_controller",
        options: {}
    },
    {
        module_path: "../raw_objects/string_documents",
        instance_key: "string_documents_controller",
        options: {}
    },
    {
        module_path: "../raw_objects/raw_objects",
        instance_key: "raw_objects_controller",
        options: {}
    }
]
function NewHydratedContext(app) 
{
    var context = 
    {
        app: app
    }
    for (var i in context_object_instantiation_descriptions) {
        var description = context_object_instantiation_descriptions[i]
        var module = require("" + description.module_path)
        var instance = new module(description.options, context)
        context[description.instance_key] = instance
    }
    
    return context
}
module.exports.NewHydratedContext = NewHydratedContext