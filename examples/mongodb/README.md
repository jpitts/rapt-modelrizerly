# Modelrizerly Mongodb Demo

An example web app that uses moderizerly with mongodb to add and list lyrics.

## Setting up the Demo
    
    Modelrizerly requires both mongodb and redis to be configured (although in this example redis is not used).

    Copy the example config in the config directory to a file name matching your local environment. Modify as needed.

    cp config/environment.js.default config/dev.js

## Running the Demo
    
   NODE_ENV=dev node app.js

   http://localhost:8080/lyrics
   http://localhost:8080/api/lyrics

