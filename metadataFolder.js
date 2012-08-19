
var folder = exports.folder = function (client, data) {

    if (!data) {
	data = {};
    }

    var cursor = data.cursor;

    var metadata = data.metadata;
    if (!metadata) {
	metadata = {};
    }

    var get_delta = function (on_delta) {
	return process.nextTick(function () {
		client.delta({cursor: this.cursor},
			     on_delta);
	    });
    };

    return {
	synched:  function (when_synched, options) {
	    if (!options) {
		options = {};
	    }

	    var on_delta;
	    var that = this;

	    on_delta = function (status, delta) {
		if (status !== 200) {
		    throw {
			name: 'error',
			message: 'delta returned status ' + status
		    }
		}

		that.cursor = delta.cursor;

		var cb;
		if (delta.has_more) {
		    cb = get_delta;
		}
		else {
		    cb = function () {
			when_synched(that);
		    };
		}

		var delta_list = delta.entries;
		delta_list.reverse();

		var synch_loop = function () {
		    if (delta_list.length === 0) {
			return cb();
		    }

		    var path_meta = delta_list.pop();
		    var path = path_meta[0];
		    var meta = path_meta[1];


		    if (meta) {
			metadata[path] = meta;
			if (options.onAdd) {
			    return options.onAdd(path, meta, synch_loop);
			}
		    }
		    else {
			if (options.onRemove) {
			    if (path in metadata) {
				return options.onRemove(path, metadata[path], synch_loop);
			    }
			}
			else {
			    return options.onRemove(path, null, synch_loop);
			}
		    }
		    return synch_loop();
		};


		var go_reset = function () {
		    metadata = {};

		    return client.metadata('/', function (err, meta) {
			    metadata['/'] = meta;
			    return synch_loop();
			});
		};

		if (delta.reset) {
		
		    if (options.onReset) {
			return options.onReset(that, go_reset);
		    }
		    return go_reset();

		}
		synch_loop();
	    };

	    return get_delta(on_delta);
	},

	get: function (path) {
	    if (path in metadata) {
		return metadata[path];
	    }
	    else {
		return null;
	    }
	},
    };
};


