
// example credentials facade, using a text file as storage for the
// credentials.

var fs = require('fs');

var inherits = require('util').inherits;
var dbox = require('./dbox');

var Credentials = exports.Credentials = function (credsFile) {
    if (!credsFile) {
	credsFile = 'token_store.json';	
    }
    
    try {
	// read old credentials from file if possible.
	fileData = JSON.parse(fs.readFileSync(credsFile));
    }
    catch (e){
	fileData = {};
    }

    dbox.Credentials.call(this, fileData, {
	get: function (key, cb) {
	    return cb(null, 'not available');
	},

	set: function (key, value, cb) {
	    fileData[key] = value;
	    return fs.writeFile(credsFile, JSON.stringify(fileData), cb);
	}
    });
};

inherits(Credentials, dbox.Credentials);
