
var handler = require('./handler');

var example = function () {

    var store = new handler.SessionStore({filestore_creator: handler.local_filestore_creator});

    var login_required = function (login_url) {
	console.log('Need to log in: ' + login_url);
    };

    store.get('', function (sess) {
	sess.synched(login_required, function (sess) {
	    console.log('Files in /:');
	    l = sess.get_list('/');
	    for (idx in l) {
		console.log(l[idx].path);
	    }
	});
    });
};

example();
