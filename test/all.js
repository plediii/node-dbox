var fs     = require("fs")
var should = require("should")
var prompt = require("prompt")
var dbox = require("../dbox")
var tf = require("../textFile");

var crypto = require('crypto');

var random_string = function (cb) {
    return crypto.randomBytes(12, function(ex, buf) {
	cb(buf.toString('hex'));
    });
};

var app = dbox.app(JSON.parse(fs.readFileSync(__dirname + "/config/app.json")))

var testClient = function (creds, cb) {
    if (!cb) {
	cb = creds;
	creds = new tf.Credentials(__dirname + "/config/access_token.json")
    }


    app.session(creds).linkedClient(function (authorize_url, retry) {
        console.log("No valid token. Must do OAuth handshake...")
	prompt.start()
	prompt.get(['please authorize application at the following url and enter when done\n' + authorize_url], 
		   function (e) {
		       if (e) {
			   console.log('prompt error', e);
		       }
		       else {
			   retry();
		       }
		   });
    }, function (client) {
	return cb(client, creds);
    });
};


describe("all", function(){
    var ref;
    var client;
    
    before(function(done) {
	testClient(new tf.Credentials(__dirname + "/config/access_token.json"), function (newClient) {
	    client = newClient;
	    done();
	});
    });

    it("should create a directory", function(done) { 
	client.mkdir("myfirstdir", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should remove a directory", function(done) {
	client.rm("myfirstdir", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should create a file", function(done) {
	client.put("myfirstfile.txt", "Hello World", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should move a file", function(done) {
	client.mv("myfirstfile.txt", "myrenamedfile.txt", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should get contents of file", function(done) {
	client.get("myrenamedfile.txt", function(status, reply){
	    status.should.eql(200)
	    reply.toString().should.eql("Hello World")
	    done()
	})
    })
    
    it("should change file", function(done) {
	client.put("myrenamedfile.txt", "Hello Brazil", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should copy file", function(done) {
	client.cp("myrenamedfile.txt", "myclonefile.txt", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should get refrence from file from cpref", function(done) {
	client.cpref("myrenamedfile.txt", function(status, reply){
	    status.should.eql(200)
	    reply.should.have.property('expires')
	    reply.should.have.property('copy_ref')
	    ref = reply
	    done()
	})
    })
    
    it("should copy file from ref", function(done) {
	client.cp(ref, "myclonefilefromref.txt", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should remove renamed file", function(done) {
	client.rm("myrenamedfile.txt", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should remove cloned file", function(done) {
	client.rm("myclonefile.txt", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })
    
    it("should remove cloned file from ref", function(done) {
	client.rm("myclonefilefromref.txt", function(status, reply){
	    status.should.eql(200)
	    done()
	})
    })

    
    after(function(){
	//console.log("after step")
    })

});

describe("metadata", function(){
    var ref;
    var client, client2;

    before(function (done) {
	testClient(new tf.Credentials(__dirname + "/config/access_token.json"), function (newClient) {
	    testClient(new tf.Credentials(__dirname + "/config/access_token2.json"), function (newClient2) {
		client = newClient;
		client2 = newClient2;
		done();
	    });
	});
    });


    var newMetadata = function () {
	var metadata = app.metadata();
	metadata.should.exist;
	metadata.files().should.have.lengthOf(0);
	return metadata;
    };

    var compareSetArray = function (set, array) {
	var setCount = 0;
	for (var name in set) {
	    if (set.hasOwnProperty(name)) {
		array.should.contain(name);
		setCount = setCount + 1;
	    }
	}

	array.should.have.lengthOf(setCount);
    };
    
    var testFilesEqualFiles = function (metadata) {
	var files = metadata.files();

	for (var path in files) {
	    files[path].should.eql(metadata.file(path));
	    files[path].should.not.have.property('contents');
	}
    };

    var uploadFile = function (client, path, cb) {
	return random_string(function (content) {
	    return client.put(path, content, function (err) {
		return cb(err, content)
	    });
	});
    };

    var uploadRandomFile = function (client, cb) {
	return random_string(function (fileName) {
	    var testPath = '/' + fileName;
	    return uploadFile(client, testPath, function (err, content) {
		return cb(err, testPath, content);
	    });
	});
    };

    var fullUpdate = function (client, metadata, cb) {
	return metadata.update(client, cb);
    };


    var setUpdate = function (set) {
	set.should.be.a('object');
	return function (client, metadata, cb) {
	    return metadata.update(client, set, cb);
	};
    };

    var pathUpdate = function (path) {
	path.should.be.a('string');
	return function (client, metadata, cb) {
	    return metadata.update(client, path, cb);
	};
    };


    var nonUpdate = setUpdate({});

    var upload = function (client, path, cb) { 
	return uploadFile(client, path, cb);
    };

    var remove = function (client, path, cb) {
	return client.rm(path, cb);
    };

    var noChange = function (client, path, cb) {
	return cb(null);
    }

    var testUpdate = function (client, metadata, options) {
	options.should.have.property('update');
	options.should.have.property('expect');

	if (!options.change) {
	    options.change = upload;
	}
	var go_test = function (path)  {
	    var before = metadata.file(path);
	    return options.change(client, path, function (err) {
		should.not.exist(err);
		return options.update(client, metadata, function (err) {
		    err.should.not.exist;
		    testFilesEqualFiles();
		    var after = metadata.file(path);
		    return options.expect(before, after);
		});
	    });
	};

	if (options.path) {
	    return go_test(options.path);
	} else {
	    return random_string(function (fileName) {
		var testPath = '/' + fileName;
		return go_test(testPath);
	    });
	}
    };

    it("should update file list to complete file list on fullUpdate", function(done) { 
	var metadata = newMetadata();

	return testUpdate(client, metadata, {
	    update: fullUpdate,
	    expect: function (before, after) {

		var metas = metadata.files();
		client.readdir('/', function (status, files) {
		    status.should.not.exist;
		    files.should.have.length.above(0); // we can't really test anything unless we have some files
		    compareSetArray(metas, files);
		    return done();
		});
	    }
	});
    });

    it("should update file list to complete file list on root pathUpdate", function(done) { 
	var metadata = newMetadata();

	return testUpdate(client, metadata, {
	    update: pathUpdate('/'),
	    expect: function (before, after) {

		var metas = metadata.files();
		client.readdir('/', function (status, files) {
		    status.should.not.exist;
		    files.should.have.length.above(0); // we can't really test anything unless we have some files
		    compareSetArray(metas, files);
		    return done();
		});
	    }
	});
    });


    it("should not update file list to complete file list on empty update", function(done) { 
	var metadata = newMetadata();

	return testUpdate(client, metadata, {
	    update: nonUpdate,
	    expect: function (before, after) {
		metadata.files().should.have.lengthOf(0);
		return done();
	    }
	});
    });


    it("should update specific changed file with full update after upload, change and removal", function(done) { 
	var metadata = newMetadata();
	
	return testUpdate(client, metadata, {
	    update: fullUpdate,
	    expect: function (before, after) {
		before.should.not.exist;
		after.should.exist;
		return testUpdate(client, metadata, {
		    path: after.path,
		    update: fullUpdate,
		    expect: function (before2, after2) {
			before2.should.eql(after);
			after2.should.not.equal(before2);
			return testUpdate(client, metadata, {
			    path: after.path,
			    change: remove,
			    update: fullUpdate,
			    expect: function (beforeRm, afterRm) {
				beforeRm.should.eql(after2);
				afterRm.should.not.exist;
				metadata.files().should.have.ownProperty(after.path);
				return done();
			    }
			});
		    }
		});
	    }
	})
    });


    var getCursor = function (metadata) {
	return JSON.parse(metadata.toJSON()).deltaCursor;
    };

    it("should make and restore from JSON", function(done) { 
	var metadata = app.metadata();
	metadata.should.exist;

	metadata.toJSON().should.be.a('string');
	
	return testUpdate(client, metadata, {
	    update: fullUpdate,
	    expect: function (before, after) {
		var json = metadata.toJSON();
		json.should.be.a('string');

		var reMetadata = app.metadata(json);
		reMetadata.toJSON().should.equal(json);
		reMetadata.files().should.eql(metadata.files());
		return done();
	    }
	});
    });

    it("should have same cursor for same dropbox state", function(done) { 
	var metadata1 = app.metadata();
	var metadata2 = app.metadata();
	should.exist(metadata1);
	should.exist(metadata2);
	metadata1.should.not.be(metadata2);
	return testUpdate(client, metadata1, {
	    update: fullUpdate,
	    change: noChange,
	    expect: function (before, after) {
		should.not.exist(before);
		should.not.exist(after);
		return testUpdate(client, metadata2, {
		    update: fullUpdate,
		    change: noChange,
		    expect: function (before, after) {
			should.not.exist(before);
			should.not.exist(after);
			getCursor(metadata1).should.equal(getCursor(metadata2));
			return done();
		    }
		});
	    }
	})
    });

    it("should have same cursor for same dropbox state", function(done) { 
	var metadata1 = app.metadata();
	var metadata2 = app.metadata();
	should.exist(metadata1);
	should.exist(metadata2);
	metadata1.should.not.be(metadata2);
	return testUpdate(client, metadata1, {
	    update: fullUpdate,
	    change: noChange,
	    expect: function (before, after) {
		should.not.exist(before);
		should.not.exist(after);
		return testUpdate(client, metadata2, {
		    update: fullUpdate,
		    change: noChange,
		    expect: function (before, after) {
			should.not.exist(before);
			should.not.exist(after);
			getCursor(metadata1).should.equal(getCursor(metadata2));
			return done();
		    }
		});
	    }
	})
    });
    
    it("should be able to switch client used with metadata", function(done) { 
	var metadata = app.metadata();
	should.exist(metadata);
	
	return testUpdate(client, metadata, {
	    update: fullUpdate,
	    expect: function (before, after) {
		should.not.exist(before);
		should.exist(after);
		return testUpdate(client2, metadata, {
		    path: after.path,
		    update: fullUpdate,
		    expect: function (before2, after2) {
			before2.should.eql(after);
			after2.should.not.equal(before2);
			return testUpdate(client, metadata, {
			    path: after.path,
			    change: remove,
			    update: fullUpdate,
			    expect: function (beforeRm, afterRm) {
				beforeRm.should.eql(after2);
				afterRm.should.not.exist;
				return done();
			    }
			});
		    }
		});
	    }
	})
    })
});