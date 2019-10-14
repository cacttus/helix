import * as THREE from 'three';
import {
  Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D,
  AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, MeshPhongMaterial, BufferAttribute
} from 'three';
import { Globals, GameState } from './Globals';
import { basename } from 'upath';
import { Utils } from './Utils';
import {Random } from './Base';

import vec3 = THREE.Vector3;
import vec2 = THREE.Vector2;
import vec4 = THREE.Vector4;
import mat4 = THREE.Matrix4;


/* This data model is taken from Monogame Toolkit */
class IdItemBase {
  private _id: number = -1;
  public set Id(x: number) { this._id = x; }
  public get Id(): number { return this._id; }
}
class ResourceBase extends IdItemBase {
  private _name: string = "";
  public get Name(): string { return this._name; }
  public set Name(x: string) { this._name = x; }
}
class ImageResource extends ResourceBase {
  public Location: string = '';
  //[Jsonignore]
  public Texture: THREE.Texture = null;

  public load(loc: string = null) {
    if (loc === null) {
      loc = this.Location;
    }
    //THREE.ImageUtils.loadTexture(loc), transparent: true, opacity: 0.5, color: 0xFF0000 }))

    this.Texture = new THREE.TextureLoader().load(loc);

  }
}
class Atlas extends ImageResource {
  /*
  This is the sprite sheet.

  So, once Monogame Toolkit is finished the textrue coords will be loaded manually from a packed texture.
  for now, we;re just using straight tiled textures.
  */
  public ImageWidth: number = 0;
  public ImageHeight: number = 0;
  public TopPad: number = 1;
  public LeftPad: number = 1;
  public RightPad: number = 1;
  public TileWidth: number = 16;
  public TileHeight: number = 16;

}
class Frame extends IdItemBase {
  //[JsonProperty]
  public Delay: number = 41;
  //[JsonProperty]
  public ImageResourceId: number = -1;
  //[JsonProperty]
  public x: number = 0;
  //[JsonProperty]
  public y: number = 0;
  //[JsonProperty]
  public w: number = 0;
  //[JsonProperty]
  public h: number = 0;
}
class SpriteKeyFrame extends IdItemBase {
  //[JsonIgnore]
  public ParentAnimation: SpriteAnimationData = null;//MUST SET

  //[JsonProperty]
  public Frame: Frame;
  //[JsonProperty]
  public Position: vec2;
  //[JsonProperty]
  public Rotation: vec2;
  //[JsonProperty]
  public Scale: vec2;
  //[JsonProperty]
  public Visible: boolean;
  //[JsonProperty]
  public Color: Vector4;
}
class Model3D {
}
//SpriteComponent vs SpriteObject
//This allows us to use multi-sprite images for detailed 2D rendering.
//SpriteObject - the set of individually animated sprite components.
//SpriteComponent - a single image that is animated, transformed & etc.
// Data is Spec, the data is the static data
class SpriteComponentData extends ResourceBase {
  private ParentSprite: SpriteObjectData = null;//MUST SET
  private _loop: boolean = false;
  // [JsonProperty]
  private _lstKeyFrames: Array<SpriteKeyFrame> = new Array<SpriteKeyFrame>();

  public get Loop(): boolean { return this._loop; }
  public get KeyFrames(): Array<SpriteKeyFrame> { return this._lstKeyFrames; }
}
class SpriteAnimationData extends ResourceBase {
  //[JsonIgnore]
  private ParentSprite: SpriteObjectData = null;//MUST SET
  //[JsonProperty]
  private _lstKeyFrames: Array<SpriteKeyFrame> = new Array<SpriteKeyFrame>();
  //[JsonProperty]
  private _duration: number = 2; // duration in seconds.
  //[JsonProperty]
  private _previewKeyFrameId: number = 0;

  public get KeyFrames(): Array<SpriteKeyFrame> { return this._lstKeyFrames; }
  public set KeyFrames(x: Array<SpriteKeyFrame>) { this._lstKeyFrames = x; }
}
class SpriteObjectData extends ResourceBase {
  //[JsonProperty]
  private _origin: vec2 = new vec2(0, 0);
  //[JsonProperty]
  private _lstComponents: Array<SpriteComponentData> = new Array<SpriteComponentData>();
  //[JsonProperty]
  private _lstAnimations: Array<SpriteAnimationData> = new Array<SpriteAnimationData>();
  //[JsonProperty]
  private _model: Model3D = null;
  //[JsonProperty]
  private _previewAnimationid: number = -1;

  public get Origin(): vec2 { return this._origin; }
  public set Origin(m: vec2) { this._origin = m; }

  public get Model(): Model3D { return this._model; }
  public set Model(m: Model3D) { this._model = m; }

  public get Components(): Array<SpriteComponentData> { return this._lstComponents; }
  public set Components(x: Array<SpriteComponentData>) { this._lstComponents = x; }

  public get Animations(): Array<SpriteAnimationData> { return this._lstAnimations; }
  public set Animations(x: Array<SpriteAnimationData>) { this._lstAnimations = x; }

  public get PreviewAnimationId(): number { return this._previewAnimationid; }
  public set PreviewAnimationId(x: number) { this._previewAnimationid = x; }
}
class Tile25D {
  //The selected tile
  private _tileXY: vec2 = new vec2(0, 0);
  public get TileXY(): vec2 { return this._tileXY; }
  public set TileXY(x: vec2) { this._tileXY = x; }

  private _worldView: WorldView25D = null;
  public get WorldView(): WorldView25D { return this._worldView; }
  public set WorldView(x: WorldView25D) { this._worldView = x; }

  private _dirty: boolean = false;
  public get Dirty(): boolean { return this._dirty; }
  public set Dirty(x: boolean) { this._dirty = x; }

  private _destroyed: boolean = false;
  public get Destroyed(): boolean { return this._destroyed; }
  public set Destroyed(x: boolean) { this._destroyed = x; }

  private _bufferOffset: number = 0; // The offset of this tile in the tile buffer
  public get BufferOffset(): number { return this._bufferOffset; }
  public set BufferOffset(x: number) { this._bufferOffset = x; }

  private _location: vec3 = new vec3(0, 0, 0);
  private _rotation: vec3 = new vec3(0, 0, 0);
  private _scale: vec3 = new vec3(1, 1, 1);

  public get Position(): vec3 { return this._location; }
  public set Position(x: vec3) { this._location = x; this.markDirty(); }

  public get Rotation(): vec3 { return this._rotation; }
  public set Rotation(x: vec3) { this._rotation = x; this.markDirty(); }

  public get Scale(): vec3 { return this._scale; }
  public set Scale(x: vec3) { this._scale = x; this.markDirty(); }

  public destroy() {
    this._worldView.destroy(this);
  }
  private markDirty() {
    this._worldView.Buffer.markDirty(this);
  }
}
class Sprite25D extends Tile25D {
  //**essentially the computed animation will set TileXY in Tile25D class
  private _data: SpriteObjectData = null;

  public constructor(d: SpriteObjectData) {
    super();
    this._data = d;
  }
}
class TileBuffer extends THREE.BufferGeometry {
  private _verts: Float32Array = null;
  private _norms: Float32Array = null;
  private _colors: Float32Array = null;
  private _texs: Float32Array = null;
  private _bufferSizeTiles: number = 0;
  private _destroyed: Array<Tile25D> = new Array<Tile25D>();
  private _dirty: Array<Tile25D> = new Array<Tile25D>();

  //Note: the _tiles array allocation matches the buffer array.  It's sort of a slot map.
  private _tiles: Array<Tile25D> = new Array<Tile25D>();
  public get Tiles(): Array<Tile25D> { return this._tiles; }

  private _vsiz: number = 3;
  private _nsiz: number = 3;
  private _csiz: number = 4;
  private _tsiz: number = 2;

  private _view: WorldView25D = null;

  private _attrPosition: THREE.BufferAttribute;
  private _attrNormal: THREE.BufferAttribute;
  private _attrColor: THREE.BufferAttribute;
  private _attrTexture: THREE.BufferAttribute;

  private _usedBufferLengthTiles = 0;

  //Custom shaders
  //https://bl.ocks.org/duhaime/c8375f1c313587ac629e04e0253481f9
  //Updateing buffers
  //https://threejs.org/docs/#manual/en/introduction/How-to-update-things
  public constructor(numtiles: number, view: WorldView25D) {
    super();
    this._view = view;
    this.allocate(numtiles);
  }
  public allocate(numTiles: number) {
    this._bufferSizeTiles = numTiles;

    this._verts = new Float32Array(numTiles * 4 * this._vsiz);
    this._norms = new Float32Array(numTiles * 4 * this._nsiz);
    this._colors = new Float32Array(numTiles * 4 * this._csiz);
    this._texs = new Float32Array(numTiles * 4 * this._tsiz);

    //The tiles array matches the buffer.  it's initialized to null to indicate that this buffer slot is not taken.
    this._tiles = new Array<Tile25D>(numTiles);
    for (let i = 0; i < this._tiles.length; ++i) {
      this._tiles[i] = null;
    }

    this._verts[0] = 0;
    this._verts[1] = 0;
    this._verts[2] = 0;
    this._verts[3] = 1;
    this._verts[4] = 0;
    this._verts[5] = 0;
    this._verts[6] = 0;
    this._verts[7] = -1;
    this._verts[8] = 0;
    this._verts[9] = 1;
    this._verts[10] = -1;
    this._verts[11] = 0;

    this._texs[0] = 0;
    this._texs[1] = 1;
    this._texs[2] = 1;
    this._texs[3] = 1;
    this._texs[4] = 0;
    this._texs[5] = 0;
    this._texs[6] = 1;
    this._texs[7] = 0;

    for (let xx = 0; xx < 4; ++xx) {
      this._norms[xx * 3 + 0] = 0;
      this._norms[xx * 3 + 1] = 0;
      this._norms[xx * 3 + 2] = 1;
      this._colors[xx * 4 + 0] = 1;
      this._colors[xx * 4 + 1] = 0;
      this._colors[xx * 4 + 2] = 1;
      this._colors[xx * 4 + 3] = 1;
    }

    this._attrPosition = new THREE.BufferAttribute(this._verts, this._vsiz);
    this._attrNormal = new THREE.BufferAttribute(this._norms, this._nsiz);
    this._attrColor = new THREE.BufferAttribute(this._colors, this._csiz);
    this._attrTexture = new THREE.BufferAttribute(this._texs, this._tsiz);

    this.addAttribute('position', this._attrPosition);
    this.addAttribute('normal', this._attrNormal);
    this.addAttribute('color', this._attrColor);
    this.addAttribute('uv', this._attrTexture);

    //Threejs uses CCW default winding https://threejs.org/docs/#api/en/constants/Renderer
    let indexes = new Array<number>(numTiles * 6);//(numTiles * 6);
    for (let ii = 0; ii < numTiles * 6; ii += 6) {
      indexes[ii + 0] = 0;
      indexes[ii + 1] = 2;
      indexes[ii + 2] = 1;

      indexes[ii + 3] = 1;
      indexes[ii + 4] = 2;
      indexes[ii + 5] = 3;
    }

    this.setIndex(indexes);

    this.setDrawRange(0, 6);
  }
  public add(tile: Tile25D) {
    for (let i = 0; i < this._tiles.length; ++i) {
      if (this._tiles[i] === null) {
        this._tiles[i] = tile;
        tile.BufferOffset = i;

        if (i + 1 > this._usedBufferLengthTiles) {
          this._usedBufferLengthTiles = i+1;
        }
        break;
      }
    }

    this.markDirty(tile);
    this.updateBufferRange();
  }
  private updateBufferRange() {
    if (this._usedBufferLengthTiles > 0) {
      //*6 = we're using indexes here
      this.setDrawRange(0, this._usedBufferLengthTiles * 6);
    }
    else {
      this.setDrawRange(0, 6);
    }
  }
  public update() {
    //Update Destroyed
    for (let i = 0; i < this._destroyed.length; ++i) {
      let off: number = this._tiles[i].BufferOffset;
      this._tiles[off] = null;
    }
    this._destroyed = new Array<Tile25D>();

    this.copyTiles();
  }
  public destroy(tile: Tile25D) {
    this._destroyed.push(tile);
    tile.Destroyed = true;
  }
  public markDirty(t: Tile25D) {
    if (t.Dirty === false) {
      if (t.Destroyed === false) {
        t.Dirty = true;
        this._dirty.push(t);
      }
    }

  }
  private copyTiles() {
    if (this._dirty.length > 0) {
      let v: Array<vec3> = new Array<vec3>(4);
      let t: Array<vec2> = new Array<vec2>(4);
      //Update Dirty
      for (let i = 0; i < this._dirty.length; ++i) {
        let tile: Tile25D = this._tiles[i];
        let off: number = tile.BufferOffset*4;
        /*
        0 --- 1
        2 --- 3
        */
        v[0] = tile.Position.clone().add(this._view.position); // relative to the 2D view.
        v[1] = v[0].clone().add(this._view.Right.clone().multiplyScalar(this._view.TileWidth));
        v[2] = v[0].clone().add(this._view.Down.clone().multiplyScalar(this._view.TileHeight));
        v[3] = v[2].clone().add(this._view.Right.clone().multiplyScalar(this._view.TileWidth));

        for (let vi = 0; vi < 4; ++vi) {
          let vv = off + vi;

          this._verts[vv * this._vsiz + 0] = v[vi].x;
          this._verts[vv * this._vsiz + 1] = v[vi].y;
          this._verts[vv * this._vsiz + 2] = v[vi].z;

          this._norms[vv * this._nsiz + 0] = this._view.Normal.x;
          this._norms[vv * this._nsiz + 1] = this._view.Normal.y;
          this._norms[vv * this._nsiz + 2] = this._view.Normal.z;

          this._colors[vv * this._csiz + 0] = 1;
          this._colors[vv * this._csiz + 1] = 1;
          this._colors[vv * this._csiz + 2] = 1;
          this._colors[vv * this._csiz + 3] = 1;
        }

        //Testing
        this._texs[off*2 + 0] = 0;
        this._texs[off*2 + 1] = 1;

        this._texs[off*2 + 2] = 1;
        this._texs[off*2 + 3] = 1;

        this._texs[off*2 + 4] = 0;
        this._texs[off*2 + 5] = 0;

        this._texs[off*2 + 6] = 1;
        this._texs[off*2 + 7] = 0;

        tile.Dirty = false;
      }
      //(this.attributes['position'] as BufferAttribute).needsUpdate = true;
      //(this.attributes['normal'] as BufferAttribute).needsUpdate = true;
      //(this.attributes['color'] as BufferAttribute).needsUpdate = true;
      //(this.attributes['uv'] as BufferAttribute).needsUpdate = true;

       this._attrPosition.needsUpdate = true;

      // //If normal and color don't change we don't really  need updat the
       this._attrNormal.needsUpdate = true;
       this._attrColor.needsUpdate = true;
       this._attrTexture.needsUpdate = true;

      this.computeBoundingBox();
      this.computeBoundingSphere();


      this._dirty = new Array<Tile25D>();
    }
  }

}
// This class is a viewport into the 2D game world.  It's a single canvas and can have a sepcific witdth and height.
class WorldView25D extends Object3D {
  private _tilesWidth: number = 10;
  private _tilesHeight: number = 10;
  private _tileWidth: number = 1;
  private _tileHeight: number = 1;

  public get TilesWidth(): number { return this._tilesWidth; }
  public get TilesHeight(): number { return this._tilesHeight; }
  public get TileWidth(): number { return this._tileWidth; }
  public get TileHeight(): number { return this._tileHeight; }

  public Atlas: Atlas = null;

  private _buffer: TileBuffer = null;
  public get Buffer(): TileBuffer { return this._buffer; }

  public Pos: vec3 = new vec3(0, 0, 0);
  public Normal: vec3 = new vec3(0, 0, 0);
  public Right: vec3 = new vec3(0, 0, 0);
  public Down: vec3 = new vec3(0, 0, 0);

  private _boxHelper: THREE.BoxHelper
  private _mesh: THREE.Mesh = null;

  public constructor(tilesw: number, tilesh: number, tilew: number, tileh: number, r: Atlas) {
    super();

    this._tilesWidth = tilesw;
    this._tilesHeight = tilesh;
    this._tileWidth = tilew;
    this._tileHeight = tileh;

    //This is a default junk
    this.Atlas = r;

    this._buffer = new TileBuffer(this._tilesWidth * this._tilesHeight * 4, this);

    let mat: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      map: r.Texture,
      vertexColors: THREE.VertexColors,
      flatShading: true
      , transparent: true
    });
    this._mesh = new THREE.Mesh(this._buffer, mat);

    this.add(this._mesh);
  }
  private updatePlane() {
    let n = new vec3();
    this.getWorldDirection(n);
    let p: vec3 = new vec3();
    this.getWorldPosition(p);

    this.Pos = p;
    this.Normal = n;
    this.Normal.normalize();
    this.Right = (new vec3(0, 1, 0)).cross(this.Normal);//.clone().cross();
    this.Right.normalize();
    this.Down = this.Right.clone().cross(this.Normal);
    this.Down.normalize();
  }
  public destroy(tile: Tile25D) {
    this._buffer.destroy(tile);
  }
  public update(dt: number) {
    //Update the plane information
    this.updatePlane();
    this._buffer.update();

    if (this._boxHelper !== null) {
      this.remove(this._boxHelper);
    }
    this._boxHelper = new THREE.BoxHelper(this._mesh, new THREE.Color(0xffff00));
    this.add(this._boxHelper);
  }
}
class WorldManager25D extends Object3D {
  private _views: Array<WorldView25D> = new Array<WorldView25D>();
  public get views(): Array<WorldView25D> { return this._views; }

  public addView(v: WorldView25D) {
    this._views.push(v);
    this.add(v);
  }

  public update(dt: number): void {
    for (let i = 0; i < this._views.length; ++i) {
      this._views[i].update(dt);
    }
  }
}

let g_pointlight: THREE.PointLight = null;
let g_ambientlight: THREE.AmbientLight = null;
let g_world: WorldManager25D = null;
let axis: THREE.AxesHelper = null;

$(document).ready(function () {
  Globals.setFlags(document.location);

  Globals.init();
  Globals.prof.frameStart();

  createWorld();
  createBackground();

  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(1);
    Globals.scene.add(axis);
  }

  Globals.prof.frameEnd();

  $('#outPopUp').hide();

  Globals.startGameEngine(gameLoop);
});
function createWorld() {
  g_world = new WorldManager25D();

  let r = new Atlas();
  r.load('./dat/img/sprites.png');

  //Addijng 2 just cuz
  let w = new WorldView25D(10, 7, 1, 1, r);
  w.position.z = -2;
  g_world.addView(w);

  let w2 = new WorldView25D(10, 7, 1, 1, r);
  w2.position.z = 2;
  g_world.addView(w2);

  Globals.scene.add(g_world);

  let t = new Tile25D();
  t.TileXY = new vec2(0, 0);
  w.Buffer.add(t);

  for(let xx=0; xx<20; ++xx){
    t = new Tile25D();
    t.TileXY = new vec2(0, 0);
    t.Position.x = Random.float(-5,5);
    t.Position.y = Random.float(-5,5);
    w.Buffer.add(t);
  
  }

}
function listenForGameStart() {
  if (Globals.input.right.A.pressed() || Globals.input.right.Trigger.pressed() || Globals.input.left.A.pressed() || Globals.input.left.Trigger.pressed()) {
    startGame();
  }
}
function startGame() {
  Globals.gameState = GameState.Play;
}
function stopGame() {
  Globals.gameState = GameState.GameOver;
}

function gameLoop(dt: number) {
  Globals.prof.begin("main game loop");
  if (Globals.gameState === GameState.Title) {
    listenForGameStart();
  }

  if (axis) {
    axis.position.set(Globals.player.position.x - 3, Globals.player.position.y - 3, Globals.player.position.z - 10);
  }

  if (g_pointlight) {
    g_pointlight.position.copy(Globals.player.position.clone().add(new vec3(0, 0, 0)));
  }

  //Movement
  let player = Globals.player;
  let spd = 12;

  let amtstr = spd * Globals.input.left.Axis.x * dt;
  if (amtstr !== 0) {
    let n: vec3 = new vec3(0, 0, 0);
    Globals.camera.getWorldDirection(n);
    let r: vec3 = n.clone().cross(new vec3(0, 1, 0)).normalize();

    player.position.add(r.multiplyScalar(amtstr));
  }

  let amtfw: number = spd * Globals.input.left.Axis.y * dt;
  if (amtfw !== 0) {
    let n: vec3 = new vec3(0, 0, 0);
    Globals.camera.getWorldDirection(n);
    player.position.add(n.multiplyScalar(amtfw));
  }


  g_world.update(dt);
  Globals.prof.end("main game loop");
}
function createBackground() {
  g_ambientlight = new THREE.AmbientLight(0x404040);
  Globals.scene.add(g_ambientlight);

  g_pointlight = new THREE.PointLight(0xffff99, 1, 2000);
  Globals.scene.add(g_pointlight);
}
