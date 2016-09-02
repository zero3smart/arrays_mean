var fs = require('fs');

exports.GetTeams = function() {
    var teams = [];
    fs
        .readdirSync(__dirname)
        .forEach(function (file) {
            if (/^\./.test(file)) return;
            if (file == 'index.js') return;

            require('./' + file).Teams.forEach(function(desc) {
                teams.push(desc);
            });
        });

    return teams;
};
