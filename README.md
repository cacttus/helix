# Helix Game
Helix is a 2D game in VR.  The purpose of this project is to demonstrate how VR can be used to play 2D games, and ways in which 2D games can be played comfortably in an immersive environment.

Graduate Seminar Term Project Fall 2019


***Notes***
Tested in Chrome on Windows and with Oculus Quest.    

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



