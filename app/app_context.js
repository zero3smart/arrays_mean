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
        module_path: __dirname + "/models/raw_objects/raw_source_documents_controller",
        instance_key: "raw_source_documents_controller",
        options: {}
    },
    {
        module_path: __dirname + "/models/raw_objects/raw_row_objects_controller",
        instance_key: "raw_row_objects_controller",
        options: {}
    },
    {
        module_path: __dirname + "/models/processed_objects/processed_row_objects_controller",
        instance_key: "processed_row_objects_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/create",
        instance_key: "data_preparation_create_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/gallery",
        instance_key: "array_gallery_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/chart",
        instance_key: "array_chart_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/timeline",
        instance_key: "array_timeline_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/wordCloud",
        instance_key: "array_wordCloud_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/lineGraph",
        instance_key: "array_lineGraph_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/scatterplot",
        instance_key: "array_scatterplot_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/choropleth",
        instance_key: "array_choropleth_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/data_preparation/object_details",
        instance_key: "object_details_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/shared_pages/shared_pages_controller",
        instance_key: "shared_pages_controller",
        options: {}
    },
    {
        module_path: __dirname + "/controllers/post_process/questions/questions_controller",
        instance_key: "questions_controller",
        options: {}
    }
];
function NewHydratedContext(app) 
{
    var initialContext = 
    {
        app: app
    };

    return require("../lib/utils/runtime-context").NewHydratedContext(context_object_instantiation_descriptions, initialContext);
}
module.exports.NewHydratedContext = NewHydratedContext;