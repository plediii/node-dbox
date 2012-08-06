

var MetadataStore = function () {
    this.reset();
};

exports.MetadataStore = MetadataStore;

MetadataStore.prototype.reset = function () {
    this.metadata = {'/': {is_dir: true,
			   path:'/',
			   contents:[]}};
}


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

exports.get_parent_path = get_parent_path;

MetadataStore.prototype.get = function (path) {
    return this.metadata[path];
};

MetadataStore.prototype.get_list = function (path) {
    if (this.metadata.hasOwnProperty(path)) {
	var meta = this.metadata[path];

	if (meta.contents) {
	    return meta.contents;
	}
	else {
	    return [meta];
	}
    }
    else {
	return null;
    };
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



MetadataStore.prototype.add_file = function (path, metadata) {
    var parentpath = get_parent_path(path);

    this.metadata[path] = metadata;

    if (parentpath) {
	this.metadata[parentpath].contents = update_directory_list(this.metadata[parentpath].contents, metadata);
    };
};

MetadataStore.prototype.rm_file = function (path) {
    var parentpath = get_parent_path(path);

    if (this.metadata.hasOwnProperty(path)) {
	delete this.metadata[path];
    }

    if (parentpath) {
	this.metadata[parentpath].contents = remove_from_directory_list(this.metadata[parentpath].contents, metadata);
    };
}