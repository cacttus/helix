
<img src="/helix_logo.png" width="50%" height="50%">

# Helix VR Framework

Helix is a web-based VR framework enabling developers to create responsive browser games with 2D and 3D graphics.

## Features

The Helix game world is viewed by the user as a 2D image, yet the rendering is 2.5D.  Helix supports 3D graphics, as such, you may
use OpenGL (gl markup) models and load them into the framework.  Helix has been tested in Chrome, Edge, and Firefox. 
Helix runs solely on top of three.js and is written and compiled with the Typescript transpiler.

The animation system of Helix is based on sprite sheets.  All the game animation is thus frame-based animation.
The world-editor, *and* sprite-creator are implemented completely in the [Tiled](https://www.mapeditor.org/) map editor using custom attributes.
For information about how to create sprites, cerate worlds, and load information in your game, see the example project.

## Using Tiled.

The Tiled world Helix comes with an example project of a small 2D game with examples of sprite animation and a game world with multiple portals.  
Tiled information must be exported in .json format to be used with Helix.
The Helix map editor depends on flood-filling regions of rooms with Tiled. Thus, in Tiled, you only ever need one .json (tmx) map for the whole game.
The reason for this is to make the game world spatially coherent, and also makes it easier to generate a map from the imported game world data.

## Future Releases

* Creating sprite animations in tiled is a cumbersome process. The future of Helix we will find or create a new way to import sprites, using a more detailed world editor.  

## Setup Instructions 
After pulling down the Helix source code, take the following steps to setup the environment.
* If using Windows, install [git bash](https://git-scm.com/downloads), or another git interface if you do not currently have one.
* Install [node.js](https://nodejs.org/en/download/) if it isn't installed.
* Install webpack (npm -g webpack).
* Install webpack-dev-server (npm -g webpack-dev-server).
* Install three.js (npm -g three.js).
* Install typescript (npm -g typescript).
* Navigate to the /helix folder
* Type *npm webpack --watch --colors*, press enter
* Open a separate git instance and type *npm start*, press enter
* Open up a browser window and in the URL bar, type *localhost:8000*
* The example project will appear in your browser window.  You can modify the code with hot reload while running webpack-dev-server.

### Notes 
* Deployable HTML and .JS files are located in /helix/dist
* You should not need @types/three because three comes with its own types.  However, if you get three.js errors, run *npm -i @types/three*
* Sometimes webpack or webpack-dev-server loses track of the file changes.  To fix this, Ctrl+C inside of the webpack and webpack-dev-server windows, and run them again.

