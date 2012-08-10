
var creds = require('./creds');
var metadatastore = require('./metadatastore');
var MetadataStore = metadatastore.MetadataStore;

exports.get_parent_path = metadatastore.get_parent_path;

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
    this.filestore_factory = options.filestore_factory;

    this.metadata_cursor = null;
    this.metadata = new MetadataStore();
};

exports.Session = Session;

Session.prototype.linked = function (login_required, when_linked) {
    var sess = this;
    
    var go_login = function () {
	return sess.app.requesttoken(function (status, request_token) {
	    sess.creds.request = request_token;
	    if (sess.credstore) {
		sess.credstore.store(sess.name, sess.creds);
	    }
	    return login_required(request_token.authorize_url);
	});
    };

    var go_linked = function () {
	if (!sess.client) {
	    sess.client = sess.app.client(sess.creds.access);
	}
	if (!sess.filestore) {
	    if (sess.filestore_factory) {
		sess.filestore = sess.filestore_factory(sess.name);
	    }
	}
	return when_linked(sess);
    };

    var link_creds = function () {
	
	if (sess.creds.request) {
	    if (sess.creds.access) {
		return go_linked();
	    }

	    return sess.app.accesstoken(sess.creds.request, function (status, access_token) {
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

Session.prototype.add_file = function (path, meta, cb) {
    this.metadata.add_file(meta.path, meta);
    if (this.filestore) {
	return this.filestore.add_file(this.client, path, meta,
				       cb);
    }
    else {
	return cb();
    }
};

Session.prototype.file_url = function (path, cb) {
    this.client.media(path, function (err, body) {
	if (err != 200){
	    throw 'err = ' + err;
	}
	cb(body);
    });
};

Session.prototype.rm_file = function (path, cb) {
    this.metadata.rm_file(path);
    if (this.filestore) {
	return this.filestore.rm_file(path, cb);
    }
    else {
	return cb();
    }
};

Session.prototype.synched = function (login_required, when_synched) {
    var sess = this;
    this.linked(login_required, function (sess) {
	var on_delta, get_delta;
	var client = sess.client;

	var filestore = sess.filestore;

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

	    var synch_loop = function () {
		if (!delta_list.length) {
		    return cb();
		}

		var path_meta = delta_list.pop();
		var path = path_meta[0];
		var meta = path_meta[1];


		if (meta) {
		    return sess.add_file(path, meta, synch_loop);
		}
		else {
		    return sess.rm_file(path, synch_loop);
		}
	    };


	    sess.metadata_cursor = delta.cursor;
	    if (delta.reset) {
		sess.metadata.reset();
		if (sess.filestore) {
		    return sess.filestore.reset(synch_loop);
		}
	    }
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
    return this.metadata.get(dropbox_path);
};


Session.prototype.put = function (path, body, cb) {
    var sess = this;
    this.client.put(path, body, function (err, meta) {
	if (err != 200) {
	    throw 'err = ' + err;
	}
	sess.add_file(path, meta);
	cb(meta);
    });
}