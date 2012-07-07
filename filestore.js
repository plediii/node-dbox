
var path = require('path');
var temp = require('temp');
var fs = require('fs');

var MetaDataStore = function () {
    this.reset();
};

MetaDataStore.prototype.reset = function () {
    this.allfiles = {'/' : {is_dir: true,
			    contents: []}};
};

var get_parent_path = function (dropboxpath) {

    if (dropboxpath === '/') {
	return null;
    }

    var last_slash_idx = dropboxpath.lastIndexOf('/')
    if (last_slash_idx >= 0) {
	var parent_path = dropboxpath.substr(0, last_slash_idx);
	if (!parent_path) {
	    parent_path = '/';
	}
	return parent_path;
    } 
    else {
	return '/';
    }
};


var update_directory_list = function (list, newmeta) {
    var newlist = [];
    var present = false;
    
    for (var idx in list) {
	if (list[idx].path === newmeta.path) {
	    present = true;
	}
	newlist.push(list[idx]);
    }

    if (!present) {
	newlist.push(newmeta);
    }

    return newlist;
};

var remove_from_directory_list = function (list, meta) {
    var newlist;

    for (var idx in list) {
	if (list[idx].path !== meta.path) {
	    newlist.push(list[idx]);
	}
    }

    return newlist;
};


MetaDataStore.prototype.add_file = function (dropboxpath, metadata) {
    var allfiles = this.allfiles;

    if (metadata.is_dir) {
	if (!metadata.hasOwnProperty('contents')) {
	    metadata.contents = [];
	}
    }

    if (allfiles.hasOwnProperty(dropboxpath)) {
	var f = allfiles[dropboxpath];
	for (prop in metadata) {
	    if (metadata.hasOwnProperty(prop)) {
		f[prop] = metadata[prop];
	    }
	}
    }
    else {
	allfiles[dropboxpath] = metadata;
    }

    var parent_path = get_parent_path(dropboxpath);
    if (parent_path) {
	this.allfiles[parent_path].contents = update_directory_list(this.allfiles[parent_path].contents, metadata);
    }
};

MetaDataStore.prototype.get_list = function (dropboxpath) {
    if (this.allfiles.hasOwnProperty(dropboxpath)) {
	var metadata = this.allfiles[dropboxpath];
	
	if (metadata.is_dir) {
	    return metadata.contents;
	}
	else {
	    return [metadata];
	}
    }
    return false;
};

MetaDataStore.prototype.rm_file = function (dropboxpath) {
    
    if (this.allfiles.hasOwnProperty(dropboxpath)) {
	var parent_path = get_parent_path(dropboxpath);
	if (parent_path) {
	    this.allfiles[parent_path] = remove_from_directory_list(this.allfiles[parent_path], this.allfiles[dropboxpath]);
	}
	var metadata = this.allfiles[dropboxpath];
	delete this.allfiles[dropboxpath];
	return metadata;
    }
    return false;
};

var FileStore = function (metadata_store) {
    this.cursor = null;

    if (!metadata_store) {
	metadata_store = new MetaDataStore();
    }

    this.target_path = null;
    this.all_metadata = metadata_store;
};

FileStore.prototype.set_synch_path = function (cb, target_path) {

    if (!this.target_path) {
	if (target_path) {
	    this.target_path = target_path;
	    return fs.exists(target_path, function (exists) {
		if (!exists) {
		    return fs.mkdir(target_path, function (err) {
			if (err) {
			    throw err;
			}
			if (cb) {
			    cb(target_path, true);
			}
		    });
		}
		else {
		    if (cb) {
			cb(target_path, true);
		    }
		}
	    });
	}
	else {
	    var file_store = this;
	    temp.mkdir('node-dbox', function (err, dirPath) {
		file_store.target_path = dirPath;
		if (cb) {
		    cb(file_store.target_path, true);
		}
	    });

	    return;
	}
    }
    else {
	console.log('replacing old target_path');
	if (target_path) {
	    var oldpath = this.target_path;
	    this.target_path = target_path;
	    fs.rename(oldpath, target_path, function (err) {
		if (err) {
		    throw err;
		}

		if (cb) {
		    cb(target_path, false);
		}
	    })
	}
	else {
	    console.log('actually doing nothing');
	    // nothing to actually do
	    cb(this.target_path, false);
	}
    }
};

FileStore.prototype.local_path = function (dropbox_path) {
    if (dropbox_path !== '' && dropbox_path[0] === '/') {
	dropbox_path = dropbox_path.substr(1);
    }
    var local_path = path.join(this.target_path, dropbox_path);
    return local_path;
}

FileStore.prototype.local_to_dropbox_path = function (local_path) {
    return path.relative(this.target_path, local_path);
}

    // def create_file(self, client, dropbox_path, current_path):
    //     local_path =  os.path.join(self.target_path, dropbox_path)
    //     try:
    //         shutil.copy(current_path, local_path)
    //     except shutil.Error:
    //         pass

    //     with open(local_path) as f:
    //         metadata= self.allfiles[dropbox_path] = client.put_file(dropbox_path, f, overwrite=True)
            
    //     parentpath = self.get_parent(dropbox_path)
    //     self.allfiles[parentpath] = client.metadata(parentpath)
        
    //     return metadata


FileStore.prototype.add_file = function (client, dropboxpath, metadata, cb) {
    console.log('FileStore.add_file: ' + dropboxpath);
    console.log('target_path = ' + this.target_path);
    this.all_metadata.add_file(dropboxpath, metadata);

    if (this.target_path) {
	var local_path = this.local_path(dropboxpath);
	if (metadata.is_dir) {
	    return fs.mkdir(local_path, function (err) {
		if (err) {
		    throw err;
		}
		if (cb) {
		    cb();
		}
	    });
	}
	else {
	    console.log('downloading content');
	    client.get(dropboxpath, function (status, buf, meta) {
		console.log('writing downloaded content to ' + local_path);
		fs.writeFile(local_path, buf, function (err) {
		    if (err) {
			throw err;
		    }
		    if (cb) {
			cb();
		    }
		});
	    });
	}
    }
    else {
	if (cb) {
	    cb();
	}
    }
};

FileStore.prototype.rm_file = function (dropboxpath, cb) {
    var oldmeta = this.all_metadata.rm_file(dropboxpath);
    if (oldmeta) {
	var local_path = this.local_path(oldmeta.path);

	if (oldmeta.is_dir) {
	    return fs.rmdir(local_path, function (err) {
		if (err) {
		    throw err;
		}
		if (cb) {
		    cb();
		}
	    });
	}
	else {
	    return fs.unlink(local_path, function (err) {
		if (err) {
		    throw err;
		}
		if (cb) {
		    cb();
		}
	    });
	}
    }
    else {
	if (cb) {
	    cb();
	}
    }
};

FileStore.prototype.get_list = function (dropboxpath) {
    return this.all_metadata.get_list(dropboxpath);
};

FileStore.prototype.get_metadata = function (dropboxpath) {
    return this.all_metadata.allfiles[dropboxpath];
};

    // def get_contents(self, dropboxpath):
    //     if dropboxpath in self.allfiles:
    //         with open(self.local_path(dropboxpath)) as f:
    //             return f.read()
    //     else:
    //         raise NotExist(dropboxpath)


FileStore.prototype.reset = function () {
    this.all_metadata.reset();
    this.cursor = null;
    
        // target_path = self.target_path
        // if os.path.exists(target_path):
        //     shutil.rmtree(target_path)
        // os.mkdir(target_path)
};

exports.FileStore = FileStore;
exports.MetaDataStore = MetaDataStore;