
var fs = require('fs');

var Creds = function (request, access) {
    this.request = request;
    this.acccess = access;
};

exports.Creds = Creds;

var CredStore = function () {
    this.creds = {};
};

exports.CredStore = CredStore;

CredStore.prototype.token_file_name = function (name) {
    return 'token_store_' + name + '.json';
};

CredStore.prototype.get = function (name, cb) {
    var token_file_name = this.token_file_name(name);
    var credstore = this;

    var returnCreds = function () {
	if (credstore.creds.hasOwnProperty(name)) {
	    return cb(credstore.creds[name]);
	}
	else {
	    return loadCreds();
	}
    };

    var setCreds = function (creds) {
	if (!credstore.creds.hasOwnProperty(name)) {
	    credstore.creds[name] = creds;
	}
	return returnCreds();
    };

    var loadCreds = function () {
	return fs.exists(token_file_name, function (exists) {
	    if (exists) {
		fs.readFile(token_file_name, 'utf8', function (err, data) {
		    if (err) {
			creds = new Creds();
		    }
		    else {
			try {
			    creds = JSON.parse(data);
			}
			catch (err) {
			    creds = new Creds();
			}
		    }
		    return setCreds(creds);
		});
	    }
	    else {
		return setCreds(new Creds());
	    }
	});
    };

    returnCreds();
};

CredStore.prototype.store = function (name, creds) {
    var token_file_name = this.token_file_name(name);
    this.creds[name] = creds;
    fs.writeFile(token_file_name, JSON.stringify(creds), function (err) {
	if (err) {
	    throw err;
	}
    });
}
