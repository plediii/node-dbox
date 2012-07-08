
var creds = require('./creds');
var MetadataStore = require('./metadatastore').MetadataStore;

var Session = function (name, options) {
    if (!options) {
	options = {};
    }
    if (!options.creds && !options.credstore) {
	throw "No creds provided.";
    }
    if (!options.app) {
	throw "No app provided.";
    }

    this.name = name;
    this.creds = options.creds;
    this.credstore = options.credstore;
    this.client = null;
    this.app = options.app;
    this.filestore = options.filestore;

    this.metadata_cursor = null;
    this.metadata = new MetadataStore();
};

exports.Session = Session;

Session.prototype.linked = function (login_required, when_linked) {
    var sess = this;
    
    var go_login = function () {
	return sess.app.request_token(function (status, request_token) {
	    sess.creds.request = request_token;
	    if (sess.credstore) {
		sess.credstore.store(sess.name, sess.creds);
	    }
	    return login_required(request_token.authorize_url);
	});
    };

    var go_linked = function () {
	if (!sess.client) {
	    sess.client = sess.app.createClient(sess.creds.access);
	}
	return when_linked(sess);
    };

    sess = this;
    var link_creds = function () {
	
	if (sess.creds.request) {
	    if (sess.creds.access) {
		return go_linked();
	    }

	    return sess.app.access_token(sess.creds.request, function (status, access_token) {
		if (status !== 200) {
		    return go_login();
		}
		sess.creds.access = access_token;
		if (sess.credstore) {
		    sess.credstore.store(sess.name, sess.creds);
		}
		return go_linked();
	    });
	}
	else {
	    return go_login();
	}
    };

    if (!this.creds) {
	return this.credstore.get(this.name, function (creds) {
	    sess.creds = creds;
	    link_creds();
	});
    }
    else {
	return link_creds();
    }


};

Session.prototype.synched = function (login_required, when_synched) {
    var filestore = this.filestore;
    var sess = this;
    this.linked(login_required, function (sess) {
	var on_delta, get_delta;
	var client = sess.client;

	get_delta = function () {
	    client.delta({cursor: sess.metadata_cursor},
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
		cb = function () {
		    when_synched(sess);
		};
	    }

	    var delta_list = delta.entries;
	    delta_list.reverse();

	    if (delta.reset) {
		if (sess.filestore) {
		    sess.filestore.reset();
		}
		sess.metadata.reset();
	    }
	    sess.metadata_cursor = delta.cursor;
	    
	    var synch_loop = function () {
		if (!delta_list.length) {
		    return cb();
		}

		var path_meta = delta_list.pop();
		var path = path_meta[0];
		var meta = path_meta[1];

		if (meta) {
		    if (filestore) {
			filestore.add_file(client, path, meta,
					   synch_loop);
		    }
		    sess.metadata.add_file(meta.path, meta);
		}
		else {
		    if (filestore) {
			filestore.rm_file_path(path);
		    }
		    sess.metadata.rm_file(metadata.path);
		}
		return synch_loop();
	    };
	    synch_loop();

	};

	return get_delta();
    });
};

Session.prototype.get_list = function (dropbox_path) {
    var sess = this;
    
    return this.metadata.get_list(dropbox_path);
};

Session.prototype.get_metadata = function (dropbox_path) {
    if (this.metadata.hasOwnProperty(dropbox_path)) {
	return this.metadata[dropbox_path];
    }
    else {
	return null;
    }
};
