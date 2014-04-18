// Node modules
////////////////////////////////////////////////////////////////////////////////
var Util = require("util")
	, Emitter = require("events").EventEmitter

// External interface
////////////////////////////////////////////////////////////////////////////////
var Common = require("./common")
	// Alias for the external interface
	, API = module.exports = exports

// Database Adapter base-object 
////////////////////////////////////////////////////////////////////////////////
var DSAdapter = API.DSAdapter = function DSAdapter() {}
Util.inherits(DSAdapter, Emitter);

API.bind_model_to_cb = DSAdapter.prototype.bind_model_to_cb 
	= function bind_model_to_cb(model, cb)
{
	if(!cb) {throw Error("Invalid callback passed to bind_model_to_cb");}
	return function(err, data) {
		if(Common.typeOf(cb) !== 'function') {
			console.log("Invalid callback!", cb);
			cb = function() {};
		}
		if(err) {return cb(err);}
		else if(!data) {return cb(err, data);}

		var data_type = Common.typeOf(data);
		if(data_type === "object") {
			return cb(err, model.copyFrom(data));
		} else if(data_type === "array") {
			if (data.length == 1) {
        return cb(err, model.copyFrom(data[0]));
      } else {
        // TODO: this needs to be re-worked
        return cb(err, data.map(function(obj) {return model.copyFrom(obj);}));
		  }
    } else {
			return cb(err, data);
		}
	}
}

DSAdapter.prototype.create = function()
	{throw Error("Child object does not override *.prototype.create");}

DSAdapter.prototype.read = function()
	{throw Error("Child object does not override *.prototype.read");}

DSAdapter.prototype.update = function()
	{throw Error("Child object does not override *.prototype.update");}

DSAdapter.prototype.destroy = function()
	{throw Error("Child object does not override *.prototype.destroy");}

DSAdapter.prototype.query = function()
	{throw Error("Child object does not override *.prototype.query");}

DSAdapter.prototype.find = function()
	{throw Error("Child object does not override *.prototype.find");}

// External interface
////////////////////////////////////////////////////////////////////////////////
API.datastores = {};

API.context = undefined;

API.init = function (attr) {

  /* attrs:
      context - contains config and logger
  */
  
  API.context = attr.context;
  
  // intialize the datastores
  API.init_mongodb(attr.context.config.mongodb);
  API.init_redis(attr.context.config.redis);

}



API.attach_datastores = function(obj)
{
	Object.defineProperties(obj, {
		db_instance: {
			value: function() {
				return this._db_instance;
			}
		, writeable: false
		, configurable: false
		, enumerable: false
		}
	,	db_driver: {
			value: function(name) {
				if(!API.datastores[name]) {
					throw Error("Datastore '"+name+"' could not be found!");
				} else {
					
					Object.defineProperty(this, "_db_instance", {
						// Need to refactor the "ensure resource" concept into something
						// more datastore specific
						value: API.datastores[name].ensure_resource(this.model_name())
					, configurable: false
					, enumerable: false
					});
				}
			}
		, writeable: false
		, configurable: false
		, enumerable: false
		}
	});
}

API.register_datastore = function(path, config)
{
	var ds;
	
	if(path[0] === "/") {
	// Assume we're given a full path
		ds = require(path);
	} else {
	// Assume we're given a name
		ds = require("./datastores/"+path);
	}

	var ds = new (ds)(config);
	API.datastores[ds.ds_name] = ds;
	return ds;	
}

// configuration of datasources
////////////////////////////////////////////////////////////////////////////////

/*
var auth = {host: 0, port:0, db:0, user:0, pass:0};
*/

//var auth = require("./auth");
//var mongodb = API.register_datastore("mongodb", auth.mongo);
//var redis = API.register_datastore("redis");


// init mongodb

var mongodb = undefined;

API.init_mongodb = function (mongodb_config) {
  mongodb = API.register_datastore("mongodb", mongodb_config);

  mongodb.on("open", function() {
    API.context.logger.info("Open mongodb connection", 
      {module:'modelrizerly', class:'Models.datastores', block:'init_mongodb'});
  });

  /**
  mongodb.on("open", function() {

  });

  mongodb.on("auth", function() {

  });
  */

}

// init redis

var redis = undefined;

API.init_redis = function (redis_config) {
  redis = API.register_datastore("redis", redis_config);

  API.context.logger.info("Open redis connection", 
    {module:'modelrizerly', class:'Models.datastores', block:'init_redis'});


}


