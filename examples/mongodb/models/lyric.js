/*

  lyric model
    representing rap lyrics

*/


/*
  node modules
*/

var Modelrizerly = require("../../../lib/modelrizerly");


/*
  model definition
*/

var Lyric = Modelrizerly.define_model("lyric", function() {
  
  var model = this;
  model.db_driver("mongodb");

  // identity
  model.pk_name("_id");
  
  // attributes
  model.string('title');
  model.string('author');
  model.string('words');
  model.number('word_count');
  model.number('line_count');
  model.boolean('is_public');

});


/*
  model functions
*/

