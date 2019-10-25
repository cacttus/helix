# Helix Game
Helix is a 2D game in VR.  The purpose of this project is to demonstrate how VR can be used to play 2D games, and ways in which 2D games can be played comfortably in an immersive environment.

Graduate Seminar Term Project Fall 2019


* Fixed the overall map bug.  It was due to the differentiation between GRID space and WORLD space.
* Grid vs World space is now a motif in this game.  Grid space is at the top left corner.
* Honestly I think its easier to just work in Top left coordinates.
* We then changet he coords to be OpenGL world coordinates when we compute the rendered quads.
* Also removed the old 'layers' on cells.  Since tile blocks dynamically change their layers when the player contacts them. (this isn't a platformer anymore).
* Cells now have an array of 'blocks' which may have multiple different layers.  It also speeds up rendering a small bit.
* Started working on making the game physics with box/box.  I don't think this is the right approach.  The game should use discrete collisions.  We can use tile/center collisions for grass.
* TODO: Integrate discrete physics.
* TODO: fix player snap to grid.
* TODO: render to texture & cylinder.


fix the grid offset problem with rendering
fix the char starting off without proper animation.

## Trello
https://trello.com/b/d4cSwyt3

## How to Run
install *npm

install *git bash

Open a separate window and run npx webpack --watch --colors

Then on your main git bash run npm start

This will start webpack-dev-server

Also note You do not need @types/three because three comes with its own types


## Debugging

Use URL parameters to enable debugging and some features: ex. metalmario.net/laserwing?ssaa=4&debug=true

Param         | Value         | Description
------------- | ------------- | ------------- 
ssaa          | 0-32          | Enables screen space antialiasing (smooths the canvas text).  Default 0.
perf          | true/false    | Enables performance logging.
debug         | true/false    | Enables debug draw.
console       | true/false    | Shows the in-game console.

## Credits



