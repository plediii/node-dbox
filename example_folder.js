
var fs = require('fs');

var app = require('./dbox').app(require('./config').dropbox);
var flder = require('./metadataFolder');

var credsFile = 'token_store.txt';

// The session object expects a facade for the credentials database
// implementing `get` and `set` for 'request' and 'access'.
var credentials = function (data) {
    if (!data) {
	data = {};
	try {
	    // read old credentials from file if possible.
	    data = JSON.parse(fs.readFileSync(credsFile));
	}
	catch (e){
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

(function example () {

    // Create a credentials facade, 
    var creds = credentials();

    var example_use = function (cli) {
	// When logged in to dropbox, session.link will call this
	// function with a linked client.
	console.log('Files in dropbox:');

	// Folder provides a synchable cache of dropbox metadata.
	var folder = flder.folder(cli);
	folder.synched(function () {
		var rootMetadata = folder.get('/');
		console.log('root meta = ');

		for (idx in rootMetadata.contents) {
		    console.log(rootMetadata.contents[idx].path);
		}
		
	    });
    };

    var login_required = function (login_url) {
	// When *not* logged in, session.link will call this function
	// with the login url.
	console.log('Please log in by visiting ' + login_url);
    };


    // Create a new session with access to a user's credentials.
    var sess = app.session(creds);

    // Get the login url if necessary, or run the example.
    sess.link(login_required, example_use);

})();

