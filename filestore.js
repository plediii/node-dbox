
var MetaDataStore = function () {
    this.reset();
};

MetaDataStore.prototype.reset = function () {
    this.allfiles_list = [];
    this.allfiles = {};
};

MetaDataStore.prototype.add_file = function (dropboxpath, metadata) {
    this.allfiles_list.push(dropboxpath);
    this.allfiles[dropboxpath] = metadata;
};

MetaDataStore.prototype.get_list = function (dropboxpath) {
    var idx = this.allfiles_list.indexOf(dropboxpath);
    if (idx >= 0) {
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
    var idx = this.allfiles_list.indexOf(dropboxpath);

    if (idx >= 0) {
	delete this.allfiles[dropboxpath];
	delete this.allfiles_list[idx];
	return true;
    }
    return false;
}

var FileStore = function (target_path, metadata_store) {
    this.target_path = target_path;
    this.cursor = null;

    if (!metadata_store) {
	metadata_store = new MetaDataStore();
    }

    this.all_metadata = metadata_store;
}



    // def local_path(self, dropbox_path):
    //     # this isn't really portable...
    //     if dropbox_path != '' and dropbox_path[0] == '/':
    //         dropbox_path = dropbox_path[1:]
    //     local_path =  os.path.join(self.target_path, dropbox_path)
    //     return local_path

    // def local_to_dropbox_path(self, local_path):
    //     return os.path.relpath(local_path, self.target_path)

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

var get_parent_path = function (dropboxpath) {
    var last_slash_idx = dropboxpath.lastIndexOf('/')
    if (last_slash_idx >= 0) {
	return dropboxpath.substr(0, last_slash_idx);
    } 
    else {
	return '/';
    }
};

FileStore.prototype.add_file = function (client, dropboxpath, metadata, cb) {
    console.log('add_file ');
    console.log(dropboxpath);
    console.log(metadata);

    var file_store = this;
    var go_metadata = function (path, metadata, cb) {
	file_store.all_metadata.add_file(dropboxpath, metadata);
	if (cb) {
	    cb();
	}
	return;
    };

    var get_metadata = function (path, cb) {
	console.log('get ');
	console.log(path);
	return client.metadata(path, function (status, metadata) {
	    if (status !== 200) {
		console.log(metadata);
		throw "status = " + status;
	    }
	    go_metadata(path, metadata, cb);
	});
    };

    if (metadata.is_dir) {
        // os.mkdir(self.local_path(dropboxpath))
	//  have to refetch metadata since dropbox doesn't update contents.
	// I could do this in a smarter way, but later...
	get_metadata(metadata.path);
    }
    else {
	go_metadata(dropboxpath, metadata);
            // with cl.closing(client.get_file(dropboxpath)) as f:
            //     with open(self.local_path(dropboxpath), 'w') as g:
            //         g.write(f.read())

    }

	// Make sure we have the latest contents in the parent.
	// Again, I can do this smarter.
    parentpath = get_parent_path(metadata.path);
    
    get_metadata(parentpath, cb);
    return this;
};

FileStore.prototype.rm_file = function (dropboxpath) {
    if (this.all_metadata.rm_file(dropboxpath)) {
	//         localpath = self.local_path(dropboxpath)
        // if metadata['is_dir']:
        //     os.rmdir(localpath)
        // else:
        //     os.remove(localpath)

    }
};

    // class NotExist(Exception):
    //     pass

    // def get_file(self, dropboxpath):
    //     if dropboxpath in self.allfiles:
    //         return self.allfiles[dropboxpath]
    //     else:
    //         raise NotExist(dropboxpath)


FileStore.prototype.get_list = function (dropboxpath) {
    return this.all_metadata.get_list(dropboxpath);
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