// Node modules
var Util = require("util")

// 3rd Party modules
var Redis = require("redis")

// ODM modules
var Common = require("../common")
	, Datastores = require("../datastores")

var _redis_error = function _redis_error(err)
	{console.log("Model - Redis error!", err);}

var _redis_ready = function _redis_ready()
{
    //console.log("Model - Redis ready!");
}

var RedisDS = module.exports = exports = function RedisDS(config)
{
	var self = this

//console.log('redis CONFIG host: ', config.host);
//console.log('redis CONFIG port: ', config.port);
//console.log('redis CONFIG options: ', config.options);

	// Attach the clients
	self.client = Redis.createClient(config.port, config.host, config.options)
	self.pub = Redis.createClient(config.port, config.host, config.options)
	self.sub = Redis.createClient(config.port, config.host, config.options)

	self.client.on("error", _redis_error);
	self.pub.on("error", _redis_error);
	self.sub.on("error", _redis_error);
	
	self.client.on("ready", _redis_ready);
	self.pub.on("ready", _redis_ready);
	self.sub.on("ready", _redis_ready);

}

// Inherit from the base datastore
Util.inherits(RedisDS, Datastores.DSAdapter);

// Set the name of the datastore
RedisDS.prototype.ds_name = "redis";

// Need to refactor this concept... See datastores.js line 74
RedisDS.prototype.ensure_resource = function ensure_resource()
{
	return this;
}

// Serialize and deserialize utility functions
var serialize = RedisDS.prototype.serialize = function serialize(data)
{
	for(var idx in data) {data[idx] = JSON.stringify(data[idx]);}
	return data;
}

var deserialize = RedisDS.prototype.deserialize = function deserialize(data)
{	
	for(var idx in data) {data[idx] = JSON.parse(data[idx]);}
	return data;
}

RedisDS.prototype.create = function create(model, cb) {
  //model.log_start_block({ classname:'modelrizerly.datastores.redis', block:'create' });

	// Assuming that we'll never need to make random keys...
	// Fix this bug later
	var id = model.model_name() + '::' + model[model.pk_name()]
		, data = serialize(model.model_data())

	// Pass the stored model back through, unless we have an error
	this.client.hmset(id, data, function(err) {
		return err ? cb(err) : cb(err, model);
	});
}

RedisDS.prototype.read = function(id, model, cb) {
	var bound_cb = this.bind_model_to_cb(model, cb)
		, id = model.model_name() + '::' + (id || model[model.pk_name()])

  //model.log_start_block({ classname:'modelrizerly.datastores.redis', block:'read', 'subject_id':id });

	// Execute the query
	this.client.hgetall(id, function(err, data) {
		
		data = deserialize(data);

		// Return through the bound cb
		bound_cb(err, data);
	});
}

RedisDS.prototype.update = function update(opts, model, cb) {
  //model.log_start_block({ classname:'modelrizerly.datastores.redis', block:'update' });

	var opts = opts || {}
		, data = model.model_data()
		, id = model.model_name() + '::' + model[model.pk_name()]

	// Only saves the fields in 'opts.fields'
	if(opts.fields) {
		for(var idx in data) {
			if(opts.fields.indexOf(idx) < 0) {delete data[idx];}
		}
	}

	this.client.hmset(id, serialize(data), function(err) {
		return err ? cb(err) : cb(err, model);
	});
}

RedisDS.prototype.destroy = function destroy(model, cb) {
  //model.log_start_block({ classname:'modelrizerly.datastores.redis', block:'destroy' });

	var client = this.client
		, id = model.model_name() + '::' + model[model.pk_name()]
	
	// Two async calls - one to get all the keys, and the other to delete them
	client.hkeys(id, function(err, keys) {
		
		// Need to make separate calls since the local redis version is 2.2.6
		// >= 2.4 allows for multiple keys in an HDEL
		var multi = client.multi()
		for(var idx in keys) {multi = multi.hdel(id, keys[idx])}
		multi.exec(cb);
	});
}

// find
// NOTE: the current implementation only finds all model records

RedisDS.prototype.find = function(query, query_options, model, cb) {
  var bound_cb = this.bind_model_to_cb(model, cb)
    //, id = model.model_name() + '::' + model[model.pk_name()]
    , client = this.client
  ;
  //model.log_start_block({ classname:'modelrizerly.datastores.redis', block:'find' });
  
  /*
  client.keys('*', function (err, keys) {
    if (err) return console.log(err);
    for(var i = 0, len = keys.length; i < len; i++) {
      console.log('key: ', keys[i]);
    }
  });
  */

  var find_arr = []; // contains the output of the find
  
  // find all keys matching this model
  client.keys(model.model_name() + '::' + '*', function (err, keys) {
    if (err) { return cb(err, find_arr);   }

    if (keys && keys[0]) {
    
      // loop over the keys    
      for (i=0; i<keys.length; i++) {
        var key = keys[i];
        
        // fetch this key's record
        client.hgetall(key, function(err, obj) {
          if (err) {
            console.error("Error occurred getting key: " + e);
          } else {

            // parse the stored json obj
            var parsed_obj = {};
            Object.keys(obj).map(function (key) {
              parsed_obj[key] = JSON.parse(obj[key]);
            });

            find_arr.push(parsed_obj); // keep pushing into the output array

          }
          
          // done looping over keys
          if (i == find_arr.length) {
            return cb(err, find_arr);  
          }
          // should return all records

        });

      }

    } else {
      return cb(err, find_arr);  
    }

  });

}

