
var path = require('path');
var temp = require('temp');
var fs = require('fs');

var child_process = require('child_process');

var FileStore = function (target_path) {
    this.cursor = null;

    this.target_path = target_path;
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


var err_or_cb = function (cb) {
    return function (err)  {
	if (err) {
	    throw err;
	}
	if (cb) {
	    return cb();
	}
    }
};


FileStore.prototype.add_file = function (client, dropboxpath, metadata, cb) {
    
    var local_path = this.local_path(dropboxpath);
    if (metadata.is_dir) {
	return fs.mkdir(local_path, err_or_cb(cb));
    }
    else {
	return client.get(dropboxpath, function (status, buf, meta) {
	    return fs.writeFile(local_path, buf, err_or_cb(cb));
	});
    }
};

FileStore.prototype.rm_file = function (dropboxpath, cb) {
    var oldmeta = this.all_metadata.rm_file(dropboxpath);
    if (oldmeta) {
	var local_path = this.local_path(oldmeta.path);

	if (oldmeta.is_dir) {
	    return fs.rmdir(local_path, err_or_cb(cb));
	}
	else {
	    return fs.unlink(local_path, err_or_cb(cb));
	}
    }
    else {
	return (err_or_cb(cb))();
    }
};

    // def get_contents(self, dropboxpath):
    //     if dropboxpath in self.allfiles:
    //         with open(self.local_path(dropboxpath)) as f:
    //             return f.read()
    //     else:
    //         raise NotExist(dropboxpath)


FileStore.prototype.reset = function (cb) {
    var target_path = this.target_path;
    return child_process.exec('rm -fr ' + target_path, 
		       function (err, stdout, stderr) {
			   if (err) {
			       throw err;
			   }
			   return fs.mkdir(target_path, function (err) {
			       if (err) {
				   throw err;
			       }
			       if (cb) {
				   cb();
			       }
			   });
		       });
};

exports.FileStore = FileStore;
