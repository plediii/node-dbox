
// example credentials facade, using a text file as storage for the
// credentials.

var fs = require('fs');

var credsFile = 'token_store.json';

exports.credentials = function (data) {
    if (!data) {
	try {
	    // read old credentials from file if possible.
	    data = JSON.parse(fs.readFileSync(credsFile));
	}
	catch (e){
	    data = {};
	}
    }

    return {
	get: function (key) {
	    if (key in data) {
		return data[key];
	    }
	    else {
		return null;
	    }
	},

	set: function (key, value) {
	    if (key in data && value === data[key]) {
		return;
	    }
	    data[key] = value;
	    fs.writeFileSync(credsFile, JSON.stringify(data));
	}
    };
};
