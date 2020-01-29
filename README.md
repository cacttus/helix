
<img src="/helix_logo.png" width="50%" height="50%">

# Helix VR Framework

Helix is a VR framework enabling developers to create VR *browser* games with 2D and 3D graphics.

## Features

Helix runs on top of three.js. The Helix game world is viewed by the user as a 2D image, yet the rendering is "2.5D".  *Helix supports 3D graphics* as such, you may
use OpenGL (gl markup) models and load them into the framework.  Helix has been tested in Chrome, Edge, and Firefox.

The framework features an imported animation system from a series of sprite sheets.  The sprite sheets importer works with the [Tiled](https://www.mapeditor.org/).  
For information about how to load the tiled information see the example project.

## Example Project

Helix comes with an example project of a small 2D sprite-based game.

## Future Releases

* Creating sprite animations in tiled is a cumbersome process. The future of Helix we will find or create a new way to import sprites, using a more detailed world editor.  

## Trello
https://trello.com/b/d4cSwyt3

## Setup Instructions 
* If using Windows, install [*git bash](https://git-scm.com/downloads), *and*, [node.js](https://nodejs.org/en/download/) or another git interface if you do not currently have one.
* Install webpack (npm -g webpack)
* Install webpack-dev-server (npm -g webpack-dev-server)
* Install three.js (npm -g three.js)
* Run webpack with: "npx webpack --watch --colors"
* Open a separate git instance and run "npm start"
* Note: You do not need @types/three because three comes with its own types

