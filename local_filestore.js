
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

var local_path = exports.local_path = function (dropbox_path, target_path) {
    if (dropbox_path !== '' && dropbox_path[0] === '/') {
	dropbox_path = dropbox_path.substr(1);
    }

    var local_path = path.join(target_path, dropbox_path);
    return local_path;
};

var split_local_path = exports.split_local_path = function (dropbox_path, target_path) {
    var file_path = local_path(dropbox_path, target_path);
    var b = file_path.lastIndexOf('/');

    if (b < 0) {
	return null;
    }
    else {
	var parent = file_path.substr(0, b+1);
	var file = file_path.substr(b+1);
	return [parent, file];
    }
};

var local_to_dropbox_path = exports.local_to_dropbox_path = function (local_path, target_path) {
    return path.relative(target_path, local_path);
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

    var file_path = local_path(dropboxpath, this.target_path);

    if (metadata.is_dir) {
	return fs.mkdir(file_path, cb);
    }
    else {
	return client.get(dropboxpath, function (status, buf, meta) {
	    return fs.writeFile(file_path, buf, cb);
	});
    }
};

FileStore.prototype.rm_file = function (dropboxpath, cb) {

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
