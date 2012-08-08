

var fs = require('fs');
var temp = require('temp');
var app = require('./dbox').app;
var creds = require('./creds');

var session = require('./session');

var default_session_factory = function (name, options) {

    return new session.Session(name, options);
};

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

    if (options.session_factory) {
	this.session_factory = options.session_factory;
    }
    else {
	this.session_factory = default_session_factory;
    }

    this.filestore_factory = options.filestore_factory;

    this.session_cache = {};
};

SessionStore.prototype.new_session = function (name) {
    return this.session_factory(name, this);
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

