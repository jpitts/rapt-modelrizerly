# Modelrizerly Mongodb Demo

An example web app that uses moderizerly with mongodb to add and list lyrics.

## Setting up the Demo
    
Modelrizerly requires both mongodb and redis to be configured (although in this example redis is not used).

First, copy the example config in the config directory to a file name matching your local environment. 

  cp config/environment.js.default config/dev.js

Modify as needed.

## Running the Demo
    
  NODE_ENV=dev node app.js

  curl http://localhost:8080/lyrics

  curl http://localhost:8080/api/lyrics

