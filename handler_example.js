
var handler = require('./handler');
var anonymous_filestore = require('./local_filestore').anonymous_filestore;

var example = function () {

    var store = new handler.SessionStore({filestore_factory: anonymous_filestore});

    var login_required = function (login_url) {
	console.log('Need to log in: ' + login_url);
    };

    store.get('', function (sess) {
	    sess.synched(login_required,
		function (sess) {
			     console.log('Local filestore in ' + sess.filestore.target_path);
			     console.log('Files in dropbox/:');
			     l = sess.get_list('/');
			     for (idx in l) {
				 console.log(l[idx].path);
			     }
		});
	});
};

example();
