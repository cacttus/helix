
<img src="/helix_logo.png" width="50%" height="50%">

# Helix VR Framework

Helix VR is a web-based VR framework enabling developers to create responsive browser games with 2D and 3D graphics.

## Features

The purpose of the Helix VR framework is to provide VR developers the ability to create 2D adventure games, either platformers, or top-down RPGs in a VR display.  To render a 2D game in VR, helix uses 3D orthographic perspective, and it supports 3D models with OpenGL (gl markup) models.  Helix has been tested in Chrome, Edge, and Firefox.   It runs solely on top of three.js and is written and compiled with the Typescript transpiler.

The animation system is based on sprite sheets.  All the game animation is thus frame-based animation.  The world-editor, *and* sprite-creator are implemented completely in the [Tiled](https://www.mapeditor.org/) map editor using custom attributes.  For information about how to create sprites, cerate worlds, and load information in your game, see the example project.

## Using Tiled

[Tiled](https://www.mapeditor.org/) information must be exported in .json format to be used with Helix.  Helix depends on one .json (.tmx) tiled world, and as many .json tilemaps (.tmd) as you like.  Tilemaps must also be exported as .json.

The Helix game-world uses flood-filled scene regions defined by a closed boundary (first sprite in the tiled map, a solid red block).  Thus, you only ever need one big map for the whole game.  The reason for this is to make the game world spatially coherent, which makes it easier to generate a mini-map from the imported game world data.  It's also somewhat easier to manage room order and portal linkage using this format.  Helix may also be modified to support multiple maps if needed.  To create doors, or portals, simply place a doorway sprite on a scene border.  When the player collides with the doorway, then Helix
will load the adjacent room.

Since Helix uses Tiled for its world-editor, creating sprite animations becomes a cumbersome process. The future of Helix we will find or create a new way to import sprites, using a more detailed world editor (possibly Monogame Toolkit).

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

