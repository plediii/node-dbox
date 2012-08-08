
var path = require('path');
var temp = require('temp');
var fs = require('fs');

exports.tmp_filestore = function (name) {
    return new FileStore();
};

var FileStore = function (target_path) {
    // A write-only filestore.  Files can be created and overwritten
    // in the target_path.

    this.target_path = target_path; // if falsy, a temporary directory will be made.
};

FileStore.prototype.local_path = function (dropbox_path) {
    if (dropbox_path !== '' && dropbox_path[0] === '/') {
	dropbox_path = dropbox_path.substr(1);
    }
    var local_path = path.join(this.target_path, dropbox_path);
    return local_path;
};

FileStore.prototype.split_local_path = function (dropbox_path) {
    var local_path = this.local_path(dropbox_path);
    var b = local_path.lastIndexOf('/');

    if (b < 0) {
	return null;
    }
    else {
	var parent = local_path.substr(0, b+1);
	var file = local_path.substr(b+1);
	return [parent, file];
    }
};

FileStore.prototype.local_to_dropbox_path = function (local_path) {
    return path.relative(this.target_path, local_path);
};

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
    var fileStore = this;
    var perms = fileStore.perms;
    var local_path = this.local_path(dropboxpath);
    if (metadata.is_dir) {
	return fs.mkdir(local_path, cb);
    }
    else {
	return client.get(dropboxpath, function (status, buf, meta) {
	    return fs.writeFile(local_path, buf, cb);
	});
    }
};

FileStore.prototype.rm_file = function (dropboxpath, cb) {
    var local_path = this.local_path(oldmeta.path);

    // Leave the file there.

    return cb();
};

    // def get_contents(self, dropboxpath):
    //     if dropboxpath in self.allfiles:
    //         with open(self.local_path(dropboxpath)) as f:
    //             return f.read()
    //     else:
    //         raise NotExist(dropboxpath)


FileStore.prototype.reset = function (cb) {
    // ensure target_directory exists and is empty
    var filestore = this;
    var target_path = filestore.target_path;

    var mk_target = function () {
	if (!filestore.target_path) {
	    return temp.mkdir('node-dbox', function (err, dirPath) {
		    filestore.target_path = dirPath;
		    return cb();
		});
	}
	return fs.mkdir(target_path, function (err) {
		cb(err);
	    });
    };

    if (!target_path) {
	return mk_target();
    }

    return fs.exists(target_path, function (exists) {
	    if (!exists) {
		return mk_target();
	    }

	    return;
	});
};

exports.FileStore = FileStore;
