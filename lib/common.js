var API = module.exports = exports

var typeOf = API.typeOf = function typeOf(val)
{
	// Covenient aliasing
	var type = typeof(val);

	if(type === "object") {
	// "object" is not descriptive enough
		if(val instanceof Array) {return "array";} 
		else if(val instanceof RegExp) {return "regexp";} 
		else if(val instanceof Date) {return "date";}
		else {return type;}

	} else {
	// The type was explicit
		return type;
	}
}

var capitalize = API.capitalize = function capitalize(word)
{
	if(!typeOf(word) === "string") {return word;}
	return (word[0].toUpperCase() + word.slice(1));
}

var deep_copy = API.deep_copy = function deep_copy(obj)
{
	return JSON.parse(JSON.stringify(obj));
}
