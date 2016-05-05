var fs = require('fs');
var files = fs.readdirSync(__dirname);
files
    .filter(function(fileName) { return fileName !== 'index.js'; })
    .forEach(function(filename) {
        var filePath = __dirname + '/' + filename;
        console.log('Running tests from %s', filePath);
        require(filePath);
    });
