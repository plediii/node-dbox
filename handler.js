

var fs = require('fs');
var filestore = require('./filestore');
var app = require('./dbox').app;

var Creds = function (request, access) {
    this.request = request;
    this.acccess = access;
}

var Session = function (creds, app, file_store, store_session) {
    this.creds = creds;
    this.client = null;
    this.app = app;

    if (!file_store) {
	file_store = new filestore.FileStore()
    }

    this.file_store = file_store;
    this.store_session = store_session;
};

Session.prototype.synch = function (login_required, linked) {
    var file_store = this.file_store;
    this.link(login_required, function (sess) {
	var on_delta, get_delta;
	var client = sess.client;

	get_delta = function () {
	    client.delta({cursor: sess.file_store.cursor},
			 on_delta);
	};

	on_delta = function (status, delta) {

	    if (status !== 200) {
		throw 'status = ' + status;
	    }

	    
	    var cb;
	    if (delta.has_more) {
		cb = get_delta;
	    }
	    else {
		cb = linked;
	    }

	    var delta_list = delta.entries;
	    delta_list.reverse();

	    if (delta.reset) {
		sess.file_store.reset();
	    }
	    sess.file_store.cursor = delta.cursor;
	    
	    var synch_loop = function () {
		if (delta_list.length) {
		    var path_meta = delta_list.pop();
		    var path = path_meta[0];
		    var meta = path_meta[1];

		    if (meta) {
			return file_store.add_file(client, path, meta,
						   synch_loop);
		    }
		    else {
			file_store.rm_file(path);
			return synch_loop();
		    }
		}
		else {
		    return cb();
		}
	    };

	    synch_loop();

	};

	return get_delta();
    });
};

Session.prototype.get_list = function (dropbox_path, login_required, linked) {
    var sess = this;
    this.synch(login_required, function () {
	sess.synch(login_required, function () {
	    linked(sess.file_store.get_list(dropbox_path));
	});
    });  
};

Session.prototype.link = function (login_required, linked) {
    var sess = this;
    
    var go_login = function () {
	return sess.app.request_token(function (status, request_token) {
	    sess.creds.request = request_token;
	    sess.store_session(sess.creds);
	    return login_required(request_token.authorize_url);
	});
    };

    var go_linked = function () {
	if (!sess.client) {
	    sess.client = sess.app.createClient(sess.creds.access);
	}
	return linked(sess);
    };

    if (this.creds.request) {
	if (this.creds.access) {
	    return go_linked();
	}

	return this.app.access_token(this.creds.request, function (status, access_token) {
	    if (status !== 200) {
		return go_login();
	    }
	    sess.creds.access = access_token;
	    sess.store_session(sess.creds);
	    return go_linked();
	});
    }
    else {
	return go_login();
    }
};    
    

var SessionStore = function (app) {
    if (!app) {
	var dbox = require('./dbox');
	app = dbox.app(require('./config').dropbox);
    }
    this.app = app;
};

SessionStore.prototype.get_session = function (name, cb) {
    if (!name) {
	name = '';
    }
    var token_file_name = 'token_store_' + name + '.json';

    var store = this;

    var store_session = function (creds) {
	fs.writeFile(token_file_name, JSON.stringify(creds), function (err) {
	    if (err) {
		throw err;
	    }
	});
    };
    
    return fs.exists(token_file_name, function (exists) {
	var creds;
	if (exists) {
	    fs.readFile(token_file_name, 'utf8', function (err, data) {
		if (err) {
		    throw err;
		}
		try {
		    creds = JSON.parse(data);
		}
		catch (err) {
		    creds = new Creds();
		}
		cb(new Session(creds, store.app, new filestore.FileStore(), store_session));
	    });
	}
	else {
	    cb(new Session(new Creds(), store.app, new filestore.FileStore(), store_session));
	}
    });
};

exports.app = app;
exports.SessionStore = SessionStore;
exports.Session = Session;
exports.Creds = Creds;

var example = function () {

    var store = new SessionStore();

    var login_required = function (login_url) {
	console.log('Need to log in: ' + login_url);
    };

    store.get_session('', function (sess) {
	sess.get_list('/', login_required, function (l) {
	    console.log('Files in /:');
	    for (idx in l) {
		console.log(l[idx].path);
	    }
	    sess.get_list('/', login_required, function (l) {
		console.log('Files in /:');
		for (idx in l) {
		    console.log(l[idx].path);
		}
	    });
	});
    });

};

