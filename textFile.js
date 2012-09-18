
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
	get: function (key, cb) {
	    if (key in data) {
		return cb(data[key], null);
	    }
	    else {
		return cb(null, null);
	    }
	},

	set: function (key, value, cb) {
	    if (key in data && value === data[key]) {
		return cb(null);
	    }
	    data[key] = value;
	    return fs.writeFile(credsFile, JSON.stringify(data), cb);
	},

	getRequestToken: function (cb) {
	    this.get('request', cb);
	},

	setRequestToken: function (token, cb) {
	    this.set('request', token, cb);
	},


	getAccessToken: function (cb) {
	    this.get('access', cb);
	},

	setAccessToken: function (token, cb) {
	    this.set('access', token, cb);
	},


    };
};
