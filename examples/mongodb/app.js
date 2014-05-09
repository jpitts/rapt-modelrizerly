/* 
  node modules
*/

var Express = require('express')
  , Partials = require('express-partials')
  , Winston = require('winston')
  , Modelrizerly = require('../../lib/modelrizerly')
;


/* 
  app context definition (required by modelrizerly)
*/


// set up the config
var service_cfg;
try {
  require.resolve('./config/' + global.process.env.NODE_ENV);
  service_cfg = require('./config/' + global.process.env.NODE_ENV).config;

} catch (e) {
  console.log('Service will use the default config: config/environment.js.default');

  // fall back to the default config
  try {
    require.resolve('./config/environment.js.default');
    service_cfg = require('./config/environment.js.default').config;

  } catch (e) {
    console.error('Cannot load config/environment.js.default!');
    process.exit(e.code);
  }
}

var logger = new (Winston.Logger) ({ });
logger.add(Winston.transports.Console);

var app_context = {
  logger: logger,
  log: function (message, attr) {
    logger.log(attr.level, message, attr);    
  },
  config: service_cfg
};


/*
  model definition
*/

var ModelLoader = require("./models/bootloader"),
    Models = Modelrizerly.init({ context: app_context });


/*
  service definition
*/


var app = Express();
app.use(Express.json()); 
app.use(Express.urlencoded());


/* 
  EJS views. 
  SEE: 
    https://github.com/publicclass/express-partials
    http://embeddedjs.com/
*/

app.use( Partials() ); 


/*
  Static files
*/

app.use(Express.static(__dirname + '/public')); 


/*
  Web routes
*/

// lyrics home

app.get('/', function(req, res){

  var query = {};
  var query_options = {};
  
  // find
  Models.Lyric().find(query, query_options, function(err, lyrics) {
 
    // render the lyrics page
    res.render('index.ejs', { 
      layout:false,
      title: 'Moderizerly Mongodb Demo',
      service_cfg: service_cfg,
      lyrics: lyrics,
      error: err ? { message: err } : null
    }); 
    
  });
});


// get lyrics

app.get('/api/lyrics', function(req, res){

  var query = {};
  var query_options = {};
  
  // find
  Models.Lyric().find(query, query_options, function(err, lyrics) {
    if(err) {
      console.error('Cannot get: ' + err + '.')
      return res.json({error: {message: err} });
    }
    
    return res.json(lyrics);
  
  });
});



// create lyric

app.post('/api/lyric', function(req, res){

  // define
  var lyric_obj = {};
  lyric_obj.title = req.body.title ? req.body.title : 'Untitled';
  lyric_obj.author = req.body.author ? req.body.author : 'Anonymous';
  lyric_obj.words = req.body.words ? req.body.words : '';
    
  // create
  Models.Lyric(lyric_obj).create(function(err, created_lyric) {
    if(err) {
      console.error('Cannot create: ' + err + '.')
      return res.json({error: {message: err} });
    }
    
    return res.json({
      success: {message: "Lyric created."}, 
      lyric_id: created_lyric.pk_value() 
    });
  
  });

});



/*
  Finalization
*/

app.listen(service_cfg.web.port);
console.log('App listening on port[' + service_cfg.web.port + '].');



