

var dbox = require('./dbox');
var fs = require('fs');
var app = dbox.app(require('./config').dropbox);


var Creds = function (request, access) {
    this.request = request;
    this.acccess = access;
}

var Session = function (creds, app, store_session) {
    this.creds = creds;
    this.client = null;
    this.app = app;
    this.store_session = store_session;
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
	if (sess.client === null) {
	    sess.client = sess.app.createClient(sess.creds.access);
	}
	return linked(sess.client);
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
	if (exists) {
	    fs.readFile(token_file_name, 'utf8', function (err, data) {
		if (err) {
		    throw err;
		}
		creds = JSON.parse(data);
		cb(new Session(creds, store.app, store_session));
	    });
	}
	else {
	    cb(new Session(new Creds(), store.app, store_session));
	}
    });
};


var example = function () {

    var store = new SessionStore(app);

    var test = function (client) {
	client.metadata('/', function (status, reply) {
	    console.log(status);
	    console.log(reply);
	});
    };


    store.get_session('', function (sess) {
	sess.link(function (login_url) {
	    console.log('Need to log in: ' + login_url);
	}, test);
    });

};

