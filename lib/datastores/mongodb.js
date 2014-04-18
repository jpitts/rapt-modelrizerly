
var Util = require("util")

// 3rd Party modules
var MongoDB = require("mongodb")
	, ObjectID = MongoDB.ObjectID

// ODM modules
var Common = require("../common")
	, Datastores = require("../datastores")

// Datasource object
var MongoDS = module.exports = exports = function MongoDS(config) 
{
	var self = this
	, server = this.server = new MongoDB.Server(config.host, config.port)
	, database = this.database = new MongoDB.Db(config.db, server, {w:1})

	database.open(function(err, data) { 
	// why not call "data" a "client"?

		if(err || (data !== database)) {throw Error("Unable to open the db");}
		self.emit("open");
		
		if(!config.user || !config.pass) {
			self.emit("auth");
			self.auth = true;
			console.log("[Mongo Warning] Connection established without auth");
			return;
		};
		
		database.authenticate(config.user, config.pass, function(err, data) {
			if(err || !data) {throw Error("Unable to auth with the db");}
			self.emit("auth")
			self.auth = true;
			console.log("Mongo is Authorized!");
		});
	});
}

// Inherit from the base datastore 
Util.inherits(MongoDS, Datastores.DSAdapter);

// Set the name for the datastore
MongoDS.prototype.ds_name = "mongodb";

// Object to hold all of the collections
MongoDS.prototype.collections = {};

// Const functions to return info about the states
MongoDS.prototype.is_open = function()
	{return this.database.serverConfig.isConnected();}

MongoDS.prototype.is_authed = function()
	{return this.auth;}

MongoDS.prototype.is_useable = function()
	{return this.is_open () && this.is_authed();}

MongoDS.prototype.ensure_resource = function(name)
{
	var self = this;
	if(!this.collections[name]) {
		
		// From my read through the source, this is 'sometimes' 
		// asynchronous... May make than an issue
		this.database.collection(name, function(err, coll) {
			if(err) {throw Error("Error opening collection '"+name+"'")};
			self.collections[name] = coll;
		});
	}
	return this;
}


// Implementations of the base db-comm functions
MongoDS.prototype.query = function()
{
	var self = this, args = arguments; 

	// This will work, but it will also retry until the end of time
	if(!this.is_useable()) {
		return setTimeout(function() {self.query.apply(self, args);}, 100);
	}

	// Grab the collection by name
	var args = Array.prototype.slice.call(arguments, 0)
		, coll = this.collections[args.shift()]
		, cmd = args.shift()

	// console.log(args, (new Error().stack));
	coll[cmd].apply(coll, args);
}

MongoDS.prototype.create = function(model, cb) {
  model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'create' });
	
  this.query(
		model.model_name()
	, "insert"
	, model.model_data()
	, {safe: true}
	, this.bind_model_to_cb(model, cb)
	);
}

MongoDS.prototype.read = function(id, model, cb) {
  //model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'read' });
  model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'read', 
    'subject_id':model.model_data()[model.pk_name()]  // must specify here
  });
	var pk_name = model.pk_name()
		, id = id || model[pk_name]
		, id_obj = {}

	// Very hacky - need to re-architect the custom PK process
	id_obj[pk_name] = (Common.typeOf(id) !== "object") && (pk_name === "_id")
	? new ObjectID(id) 
	: id;

	this.query(
		model.model_name()
	, "findOne"
	, id_obj
	, this.bind_model_to_cb(model, cb)
	);
}

MongoDS.prototype.update = function(opts, model, cb) {

	var opts = opts || {}
		, data = model.model_data()
		, pk_name = model.pk_name()
		, id = model[pk_name]
		, conds = opts.conditions || {}
		, query = opts.query || {}
		, new_doc = opts.new === undefined ? true : opts.new;
 
  // additional data to be passed to the logger
  var log_data =  { };
  if (opts.query) log_data.mongodb_query = opts.query;
  if (opts.logger_tracer_id) log_data.tracer_id = opts.logger_tracer_id;

  model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'update', 
    'subject_id':model.model_data()[model.pk_name()],  // must specify here because pk_name will be deleted for the update
    log_data: log_data
  });
  
  //console.log(opts); // very useful when debugging update queries

	// While this may double delete "_id", it isn't really a large issue
	delete data[pk_name];
	delete data["_id"];		// Mongo will throw errors if "_id" is there

	// Some hacky logic to create the right pk for the query conditions
	if(!opts.conditions) {
		conds[pk_name] = (Common.typeOf(id) !== "object") && (pk_name === "_id")
		? new ObjectID(id) 
		: id;
	}

	// Default to a full "$set"
	if(!opts.query) {
		query["$set"] = data;
	}

	this.query(
		model.model_name()
	, "findAndModify"
	, conds
	, [['_id', 'asc']]
	, query
	, {new: new_doc, upsert: (opts.upsert||false)} // bool cast covers 'undefined' case
	, this.bind_model_to_cb(model, cb)
	);
}

MongoDS.prototype.destroy = function(model, cb) {
  model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'destroy', 
    'subject_id':model.model_data()[model.pk_name()]  // must specify here because pk_name will be deleted for the destroy
  });

	var pk_name = model.pk_name()
		, id = model[pk_name]
		, id_obj = {}

	//id_obj[pk_name] = Common.typeOf(id) !== "object" ? new ObjectID(id) : id; // original code
	//console.log('destroy with pk_name ' + pk_name + '=' + id);
  id_obj[pk_name] = (Common.typeOf(id) !== "object" && pk_name == "_id") ? new ObjectID(id) : id; 
  // modified to not run strings through ObjectID(id)

	this.query(
		model.model_name()
	, "findAndModify"
	, id_obj
	, [['_id', 'asc']]
	, {}
	, {remove: true}
	, this.bind_model_to_cb(model, cb)
	);
}

/*
	
	find

	SEE: http://www.mongodb.org/display/DOCS/Querying
	SEE: https://github.com/mongodb/node-mongodb-native/blob/master/Readme.md#find

*/

MongoDS.prototype.find = function(mongo_query, mongo_query_options, model, cb) {

	/* 
	attr descr
		mongo_query
		mongp_query_options
		cb (err, output_array) 
	*/

  model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'find' });
  
  // final sorting and rendering to array
  var sort_and_render = function (finder) {

    if (mongo_query_options && mongo_query_options.sort) {
      finder.sort(mongo_query_options.sort).toArray(cb);

    } else {
      finder.toArray(cb);
    }

  }

	this.database.collection(model.model_name(), function(err, coll) {
   
    // limit and offset
    if (typeof mongo_query_options.limit !== 'undefined' && typeof mongo_query_options.offset !== 'undefined') {
 		  sort_and_render(
        coll.find(mongo_query, mongo_query_options).limit(parseInt(mongo_query_options.limit,10)).skip(parseInt(mongo_query_options.offset,10))
      );

    // limit
    } else if (typeof mongo_query_options.limit !== 'undefined') {
 		  sort_and_render(
 		    coll.find(mongo_query, mongo_query_options).limit(parseInt(mongo_query_options.limit,10))
      );

    // offset
    } else if (typeof mongo_query_options.offset !== 'undefined') {
 		  sort_and_render(
        coll.find(mongo_query, mongo_query_options).skip(parseInt(mongo_query_options.offset,10))
			);

    // nada
    } else {
 		  sort_and_render(
		    coll.find(mongo_query, mongo_query_options)
      );
    }

	});	

}


/*
	
	count

	SEE: http://www.mongodb.org/display/DOCS/Querying
	SEE: https://github.com/mongodb/node-mongodb-native/blob/master/Readme.md#find

*/

MongoDS.prototype.count = function(mongo_query, mongo_query_options, model, cb) {

	/* 
	attr descr
		mongo_query
		mongp_query_options
		cb (err, output_array) 
	*/

  model.log_start_block({ classname:'modelrizerly.datastores.mongodb', block:'count' });
  
	this.database.collection(model.model_name(), function(err, coll) {
	  coll.find(mongo_query, mongo_query_options).count(cb)
	});	

}

