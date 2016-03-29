// Context generation
// Format is like this:
// var context_object_instantiation_descriptions =
// [
//     {
//         module_path: "../raw_objects/raw_source_documents",
//         instance_key: "raw_source_documents_controller",
//         options: {}
//     },
//     {
//         module_path: "../raw_objects/raw_row_objects",
//         instance_key: "raw_row_objects_controller",
//         options: {}
//     }
// ]


// Hydrate context
function NewHydratedContext(context_object_instantiation_descriptions, initialContext_orNilForNew)
{
    var context = initialContext_orNilForNew != null ? initialContext_orNilForNew : {};
    for (var i in context_object_instantiation_descriptions) {
        var description = context_object_instantiation_descriptions[i];
        var module = require("" + description.module_path);
        var instance = new module(description.options, context);
        context[description.instance_key] = instance;
    }
    
    return context;
}
module.exports.NewHydratedContext = NewHydratedContext;