var Util = require("util")

var Properties = require("./properties")
	, Common = require("./common")
	, Datastores = require("./datastores")
  , Winston = require('winston')

	// Alias for the external interface
	, API = module.exports = exports

// Base model configuration 
////////////////////////////////////////////////////////////////////////////////
var Base = API.Base = function Base() {}

// Attaching the type-checked property definers
Properties.attach_definers(Base.prototype);

// initialize the datastores for this model
Datastores.attach_datastores(Base.prototype);
//Datastores.init({ obj:Base.prototype, context: API.context });

// CRUD Methods
////////////////////////////////////////////////////////////////////////////////
Base.prototype.create = function(cb)
	{return this.db_instance().create(this, cb);}

Base.prototype.read = function(id, cb)
	{return this.db_instance().read(id, this, cb);}

Base.prototype.update = function(opts, cb)
	{return this.db_instance().update(opts, this, cb);}

Base.prototype.destroy = function(cb)
	{return this.db_instance().destroy(this, cb);}

Base.prototype.find = function(query, query_options, cb)
	{return this.db_instance().find(query, query_options, this, cb);}

Base.prototype.count = function(query, query_options, cb)
	{return this.db_instance().count(query, query_options, this, cb);}

Base.prototype.context = function()
	{return API.context;}

Base.prototype.model_name = function()
	{return this._name;}

Base.prototype.model_data = function(opts)
	{return Common.deep_copy(this._data);}

Base.prototype.pk_value = function()
	{return this[this._pk_name];}

Base.prototype.pk_name = function(pk_name)
{
	// This will work for now...
	if(!pk_name) {return this._pk_name;}

	// Gives mongo compatibility
	Object.defineProperty(this, "_pk_name", {
		value: pk_name
	, enumerable: false
	, writeable: false
	, configurable: false
	});
}

// logger methods

Base.prototype.log_start_block = function log_start_block (attr) {

  /* attrs:
      block
      classname
      subject_id
      append_message
      log_data
  */
  
  //console.log('modelrizerly.models.log_start_block ', attr);

  var log_message = "Called " + attr.block + ' on the ' + this._name + ' model';
  if (typeof attr.append_message !== 'undefined') {
    log_message = log_message + ': ' + attr.append_message;
  } else {
    log_message = log_message + '.';
  }

  return this.log_info(log_message, attr);

}

Base.prototype.log_info = function log_info (message, attr) { attr.level = 'info'; return this.log(message, attr); }
Base.prototype.log_warn = function log_warn (message, attr) {  attr.level = 'warn'; return this.log(message, attr); }
Base.prototype.log_error = function log_error (message, attr) { attr.level = 'error'; return this.log(message, attr); }

Base.prototype.log = function log (message, attr) {

  /* attrs:
      level
      block
      classname
      subject_id
      tracer_id
  */
  
  // defaults
  var level = (typeof attr.level !== 'undefined') ? attr.level : 'info';
  var tracer_id = (typeof attr.tracer_id !== 'undefined') ? attr.tracer_id : Math.floor(Math.random()*90000000) + 10000000;
  var classname = (typeof attr.classname !== 'undefined') ? attr.classname : this.context().name + '.Models.' + this._name;
  
  var log_data =  {
    level: attr.level,
    component: API.context.component,
    module:'modelrizerly', 
    classname:classname, 
    block:attr.block, 
    subject:this._name, 
    tracer_id:tracer_id,
    log_data: attr.log_data
  };
  
  // subject id
  if (typeof attr.subject_id !== 'undefined') {
    log_data.subject_id = attr.subject_id;
  } else if (this.pk_value()) {
    log_data.subject_id = this.pk_value();
  }

  API.context.log(message, log_data);
  
  return {tracer_id:tracer_id, block:attr.block };

}



// External interface
////////////////////////////////////////////////////////////////////////////////
var model_factory = {};


// context
// after the init, context should contain an instance of winston
// however, there is a default instance that will log to the console

/*

    context attributes:
    |
    - component - string describing the component/app calling the model
    - config - object containing database connection configurations
      | 
      - mongodb
      - redis
    - logger - instance of winston
    - log - method to log with

*/

API.context = {
  logger: Winston // the default logger  
};

API.set_context = function set_context (new_context) {
  API.context = new_context;
}


// init

API.init = function init (attr) {

  /* attrs:

  */
  
  if (typeof attr.context !== 'undefined') {
    API.set_context(attr.context);
  }
  
  // initialize the datastores
  Datastores.init({ context: API.context });
  
  return API;

}


API.define_model = function(name, constructor)
{
	if(model_factory[name]) {throw Error("Model with that name is already defined!");}
	
	var model = constructor || function() {};
	Util.inherits((model_factory[name] = model), Base);
	
	Object.defineProperty(model.prototype, "_name", {
		value: name
	, writeable: false
	, configurable: false
	, enumerable: false
	});

  // convert the underscore convention to camelized
  function underscoreToCamel (str) {
    str = str.charAt(0).toUpperCase() + str.slice(1);
    return str.replace(/\_(.)/g, function (x, chr) {
      return chr.toUpperCase();
    })
  }
	API[underscoreToCamel(name)] = model.prototype.copyFrom = API.construct.bind({}, name);
  
	//API[Common.capitalize(name)] = model.prototype.copyFrom = API.construct.bind({}, name);
	return model;
}

// Name is bound, and should always be present
API.construct = function(name, data)
{
	if(!model_factory[name]) {throw Error("Model with that name is not defined!");}
	
	var instance = new model_factory[name]
		, data = data || {}

	for(var key in data) {
		if(Common.typeOf(data[key]) === "undefined") {
			console.log("Undef", key, data[key]);
		}

		// The property exists, so update it
		if(instance.hasOwnProperty(key)) {instance[key] = data[key];} 
		// The property does not exist, so add it for this instance
		else {instance[Common.typeOf(data[key])](key, data[key]);}
	}
	
	// No longer used - remove as a bugfix
	instance.rollback();

	return instance;
}
