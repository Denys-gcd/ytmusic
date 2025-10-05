This is a simple somewhat working implementation of Discord RPC for Youtube Music. 
It uses tampermonkey to retrieve information from YT Music webpage and send it to a local server at http://127.0.0.1:57234.

To use:
  1. Download [node.js](https://nodejs.org/en) 
  2. Create a Discord App
  3. Install **tampermonkey** extention into your browser (used Floorp for this)
  4. Add the '**YT Music Now Playing**' script in tampermonkey
  5. Run the following command in terminal from the base folder:
     `node nowplaying-server.js`
