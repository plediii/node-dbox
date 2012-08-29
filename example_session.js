
var dbox = require('./dbox');
var tf = require("./textFile");

(function example () {
    // Create a credentials facade, 
    var creds = tf.credentials();

    var example_use = function (cli) {
	// When logged in to dropbox, session.linkedClient will call this
	// function with a linked client.
	console.log('Files in dropbox:');
	cli.metadata('/', function (err, meta) {
		for (idx in meta.contents) {
		    console.log(meta.contents[idx].path);
		}
	    });
    };

    var login_required = function (login_url) {
	// When *not* logged in, session.link will call this function
	// with the login url.
	console.log('Please log in by visiting ' + login_url);
    };


    // Create a context in which we have a linked client.
    dbox.app(require('./config').dropbox).session(creds).linkedClient(login_required, example_use);

})();

