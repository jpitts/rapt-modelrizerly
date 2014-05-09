# Modelrizerly

A basic object modelling framework for mongodb and redis.

# Status

This software is actively under development and should not yet be used in production environments!

## Contributors

Originally created by Max Seiden.

Currently maintained by Jamie Pitts.

## Installation

First install [node.js](http://nodejs.org/), [mongodb 2.x](http://www.mongodb.org/downloads), and [redis 2.x](http://redis.io/download).

npm install rapt-modelrizerly

## Overview 

### Initializing Modelrizerly

First, an application context must be defined. It contains a winston logger instance and configuration data:

```js


var Winston = require('winston'),
    logger = new (Winston.Logger) ({ });

var app_context = {
  logger: logger,
  log: function (message, attr) {
    logger.log(attr.level, message, attr);
  },
  config: {
    mongodb: {
      host: '127.0.0.1',
      port: 27017,
      db: 'rapt_modelrizerly_demo'
    },
    redis: {
      host: '127.0.0.1',
      port: 6379,
      options: {}
    }
  }
};
```

Initialization with the app_context occurs after the models are loaded:

```js
var Modelrizerly = require("modelrizerly"),
    ModelLoader = require("./models/bootloader"),
    Models = Modelrizerly.init({ context: app_context });
```

After initialization, you can then interact with the database:

```js
Models.Lyric().find({}, {}, function(err, lyrics) {
  for (var i=0; i<lyrics.length; i++) {
    console.log(lyrics[i].title);
  } 
});
```

## Defining Models

The basics:

```js
var Modelrizerly = require("modelrizerly");

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
```

## Interacting With Models

#### Find

Query with [mongodb operators](http://docs.mongodb.org/manual/reference/operator/query/):

```js
var query = { created_at: { $gt: since_epoch } };
var query_options = { sort: {title: 1} };

Models.Lyric(query, query_options, function(err, lyrics) {
  for (var i=0; i<lyrics.length; i++) {
    console.log(lyrics[i].title);
  }
});

```

#### Read

```js
Models.Lyric({ _id: mongoid_as_string }).read(null, function(err, lyric) {
  console.log(lyric.title);
});
```
#### Create

```js
var new_lyric = {title:'My Lyric', author:'The Source', words:'My words are few.'};

Models.Lyric(new_lyric).create(function(err, created_lyric) {
  console.log(created_lyric.pk_value());
});
```

#### Update

```js
var lyric_update = {title: 'My Lyricism'};

Models.Lyric({ _id: mongoid_as_string }).read(null, function(err, lyric) {
  lyric.update({ query: '$set': lyric_update }, function (err, updated_lyric) {
    console.log(updated_lyric.title);
  });
});
```

#### Delete

```js
Models.Lyric({ _id: mongoid_as_string }).destroy(function(err) {
  console.log('deleted!');
});
```

## Example Apps

See the mongodb example web application.




