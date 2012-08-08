
var handler = require('./handler');
var tmp_filestore = require('./local_filestore').tmp_filestore;

var example = function () {

    // tmp_filestore does not persist across sessions.
    var store = new handler.SessionStore({filestore_factory: tmp_filestore});

    var login_required = function (login_url) {
	console.log('Need to log in: ' + login_url);
    };

    var example_use = function (sess) {
	console.log('Local filestore in ' + sess.filestore.target_path);
	console.log('Files in dropbox/:');
	l = sess.get_list('/');
	for (idx in l) {
	    console.log(l[idx].path);
	}
    };

    store.get('userUID1', function (sess) {
	    console.log('Synchronizing...');
	    sess.synched(login_required,
			 example_use);
	});
};

example();
