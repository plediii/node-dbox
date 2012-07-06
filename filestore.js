
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
}

var remove_from_directory_list = function (list, meta) {
    var newlist;

    for (var idx in list) {
	if (list[idx].path !== meta.path) {
	    newlist.push(list[idx]);
	}
    }

    return newlist;
}

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
	delete this.allfiles[dropboxpath];
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


FileStore.prototype.add_file = function (client, dropboxpath, metadata, cb) {
    this.all_metadata.add_file(dropboxpath, metadata);

    if (metadata.is_dir) {
        // os.mkdir(self.local_path(dropboxpath))
	//  have to refetch metadata since dropbox doesn't update contents.
	// I could do this in a smarter way, but later...
    }
    else {
            // with cl.closing(client.get_file(dropboxpath)) as f:
            //     with open(self.local_path(dropboxpath), 'w') as g:
            //         g.write(f.read())

    }

    if (cb) {
	cb();
    }

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