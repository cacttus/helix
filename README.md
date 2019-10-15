# Helix Game
Graduate Seminar Term Project Fall 2019



Essentially a Tile25D IS a Sprite25D, only a Sprite25D container may be hidden however
a Tile25D can be hidden/visible as well.  Therefore it makes sense to merge the two objects into one class and just use Sprite25D.  Tile25D will go away.
Object25D is a generic class, it also doesn't have much use.
Tile25D is only around because I thought that "hey ok so we got tiles that got no animation so we cut the data footprint" but that's just too complicated and unnecessary.












***Notes***
Tested in Chrome on Windows and with Oculus Quest.    

## How to Run
install *npm
install *git bash
Open a separate window and run 
  npx webpack --watch --colors
Then on your main git bash run
  npm start
This will start webpack-dev-server
Also note You do not need @types/three because three comes with its own tuypes


## Debugging

Use URL parameters to enable debugging and some features: ex. metalmario.net/laserwing?ssaa=4&debug=true

Param         | Value         | Description
------------- | ------------- | ------------- 
ssaa          | 0-32          | Enables screen space antialiasing (smooths the canvas text).  Default 0.
perf          | true/false    | Enables performance logging.
debug         | true/false    | Enables debug draw.
console       | true/false    | Shows the in-game console.

## Credits



