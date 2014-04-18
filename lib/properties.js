var Common = require("./common")
	// Alias for the external interface
	, API = module.exports = exports

// Default type values
const type_defaults = API.type_defaults = {
	number: function() {return 0;}
, array: function() {return [];}
, object: function() {return {};}
, string: function() {return "";}
, boolean: function() {return false;}
, date: function() {return new Date()}
};

// Builds a type checking validator
var validator_factory = API.validator_factory = function(type_name) 
	{return function(val) {return Common.typeOf(val) === type_name;};}

// Builds the property getter
var getter_factory = API.getter_factory = function(property_name)
	{return function() {return this._data[property_name];}}

// Builds the property setter
const SET_ERROR_c = "Invalid assignment of '{name}' to '{value}'";
var setter_factory = API.setter_factory = function(property_name)
{
	return function(val) {
		if(this._validators[property_name](val)) {
			this._data[property_name] = this._modified[property_name] = val;
		} else {
			throw TypeError(SET_ERROR_c
				.replace("{type}", "")	// TODO: Implement this...
				.replace("{name}", property_name)
				.replace("{value}", val)
			);
		}
	}
}

// Builds the property descriptor for the property
var attach_property = API.attach_property = function(obj, property_name, type_name)
{
	// Ensure we can add property validators
	if(!obj._validators) { 
		Object.defineProperty(obj, "_validators"
	, {value: {}, writeable: true, enumerable: false, configurable: false});
	}
	
	// Attach the property validator
	obj._validators[property_name] = validator_factory(type_name);

	// Ensure we have an internal data store
	if(!obj._data) {
		Object.defineProperty(obj, "_data"
	, {value: {}, writeable: true, enumerable: false, configurable: false});
	}
	
	// Enable us to track only fields that have changed since creation
	if(!obj._modified) {
		Object.defineProperty(obj, "_modified"
	, {value: {}, writeable: true, enumerable: false, configurable: true});
	}
	
	// Attach the property descriptor
	Object.defineProperty(obj, property_name, {
		get: getter_factory(property_name)
	, set: setter_factory(property_name)
	, enumerable: false 
	, configurable: false
	});
}

// Builds the property descriptor for the data type definers
var definer_factory = API.definer_factory = function(type_name)
{
	return {
			value: function(property_name, value) {
				attach_property(this, property_name, type_name)
				this[property_name] = value || type_defaults[type_name]();
				return this[property_name];
			}
		, writeable: false
		, enumerable: false
		, configurable: false
	};
}

// Attaches the definers for the base data types
// Probably need a better way to do the extra attachments
var attach_definers = API.attach_definers = function(obj)
{
	for(var type_name in type_defaults) {
		Object.defineProperty(obj, type_name, definer_factory(type_name));
	}

	obj.rollback = function()
		{Object.defineProperty(this, "_modified", {value: {}});}
	
	return obj;
}
