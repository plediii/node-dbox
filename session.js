
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
    this.filestore_creator = options.filestore_creator;

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
	if (!sess.filestore && sess.filestore_creator) {
	    return sess.filestore_creator(sess.name, function (filestore) {
		sess.filestore = filestore;
		return when_linked(sess);
	    });
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
		    sess.metadata.add_file(meta.path, meta);
		    if (filestore) {
			return filestore.add_file(client, path, meta,
					   synch_loop);
		    }
		}
		else {
		    sess.metadata.rm_file(metadata.path);
		    if (filestore) {
			return filestore.rm_file_path(path, 
					      synch_loop);
		    }
		    
		}
		return synch_loop();
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
