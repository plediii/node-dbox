

var fs = require('fs');
var temp = require('temp');
var local_filestore = require('./local_filestore');
var app = require('./dbox').app;
var creds = require('./creds');

var session = require('./session');

var SessionStore = function (options) {

    if (!options) {
	options = {};
    }

    app = options.app;

    if (!app) {
	var dbox = require('./dbox');
	app = dbox.app(require('./config').dropbox);
    }
    this.app = app;

    if (options.credstore) {
	this.credstore = options.credstore;
    }
    else {
	this.credstore = new creds.CredStore();
    }
    this.filestore_creator = options.filestore_creator;

    this.session_cache = {};
};

exports.local_filestore_creator = function (name, perms, cb) {
    if (!cb) {
	cb = perms;
	perms = {};
    }

    return temp.mkdir('node-dbox', function (err, dirPath) {
	if (err) {
	    throw err;
	}
	cb(new local_filestore.FileStore(dirPath, perms));
    });
};

SessionStore.prototype.new_session = function (name) {
    return new session.Session(name, {
	credstore: this.credstore,
	filestore_creator: this.filestore_creator,
	app: this.app,
    });
};

SessionStore.prototype.get = function (name, cb) {
    var sessStore = this;
    if (!name) {
	name = '';
    }
    var session_cache = this.session_cache;

    var returnSession = function () {
	if (session_cache.hasOwnProperty(name)) {
	    return cb(session_cache[name]);
	}
	else {
	    return newSession();
	}
    };

    var setSession = function (sess) {
	if (!session_cache.hasOwnProperty(name)) {
	    session_cache[name] = sess;
	}
	return returnSession();
    };

    var newSession = function () {
	var sess = sessStore.new_session(name);;

	return setSession(sess);
    };

    return returnSession();
};

exports.app = app;
exports.SessionStore = SessionStore;
exports.session = session;
exports.creds = creds;

