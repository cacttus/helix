import * as THREE from 'three';
import {
  Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D,
  AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, MeshPhongMaterial, BufferAttribute, Quaternion
} from 'three';
import { Globals, GameState } from './Globals';
import { basename } from 'upath';
import { Utils } from './Utils';
import { Random } from './Base';

import vec3 = THREE.Vector3;
import vec2 = THREE.Vector2;
import vec4 = THREE.Vector4;
import mat4 = THREE.Matrix4;

/* This data model is taken from Monogame Toolkit */
// class IdItemBase {
//   private _id: number = -1;
//   public set Id(x: number) { this._id = x; }
//   public get Id(): number { return this._id; }
// }
// class ResourceBase extends IdItemBase {
//   private _name: string = "";
//   public get Name(): string { return this._name; }
//   public set Name(x: string) { this._name = x; }
// }
class ImageResource {
  public Location: string = '';
  //[Jsonignore]
  public Texture: THREE.Texture = null;
  public Name: string = "";
  public Id: number = -1;

  public load(loc: string = null) {
    if (loc === null) {
      loc = this.Location;
    }
    //THREE.ImageUtils.loadTexture(loc), transparent: true, opacity: 0.5, color: 0xFF0000 }))
    this.Texture = new THREE.TextureLoader().load(loc);
    this.Texture.magFilter = THREE.NearestFilter;
    this.Texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.Texture.generateMipmaps = true;
  }
}
class Atlas extends ImageResource {
  /*
  This is the sprite sheet.

  So, once Monogame Toolkit is finished the textrue coords will be loaded manually from a packed texture.
  for now, we;re just using straight tiled textures.
  */
  private _topPad: number = 1;
  private _leftPad: number = 1;
  private _tileWidth: number = 16;
  private _tileHeight: number = 16;

  public get ImageWidth(): number { return this.Texture.image.Width; }
  public get ImageHeight(): number { return this.Texture.image.Height; }

  public get TopPad(): number { return this._topPad; }
  public get LeftPad(): number { return this._leftPad; }
  public get TileWidth(): number { return this._tileWidth; }
  public get TileHeight(): number { return this._tileHeight; }

  public constructor(top: number, left: number, tile_w: number, tile_h: number, tex: string = null) {
    super();
    this._topPad = top;
    this._leftPad = left;
    this._tileWidth = tile_w;
    this._tileHeight = tile_h;

    if (tex) {
      this.load(tex);
    }
  }
}
class Object25D {
  private _worldView: WorldView25D = null;
  private _dirty: boolean = false;
  private _destroyed: boolean = false;
  private _location: vec3 = new vec3(0, 0, 0);
  private _rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _scale: vec2 = new vec2(1, 1);
  private _size: vec2 = new vec2(1, 1); // this is actual size of geometry
  private _children: Array<Object25D> = new Array<Object25D>();

  public get Children(): Array<Object25D> { return this._children; }

  public get WorldView(): WorldView25D { return this._worldView; }
  public set WorldView(x: WorldView25D) { this._worldView = x; }
  public get Dirty(): boolean { return this._dirty; }
  public set Dirty(x: boolean) { this._dirty = x; }
  public get Destroyed(): boolean { return this._destroyed; }
  public set Destroyed(x: boolean) { this._destroyed = x; }

  public get Position(): vec3 { return this._location; }
  public set Position(x: vec3) { this._location = x; this.markDirty(); }
  public get Rotation(): Quaternion { return this._rotation; }
  public set Rotation(x: Quaternion) { this._rotation = x; this.markDirty(); }
  public get Scale(): vec2 { return this._scale; }
  public set Scale(x: vec2) { this._scale = x; this.markDirty(); }
  public get Size(): vec2 { return this._size; }
  public set Size(x: vec2) { this._size = x; this.markDirty(); }
  public get Width(): number { return this._size.x; }
  public set Width(x: number) { this._size.x = x; this.markDirty(); }
  public get Height(): number { return this._size.y; }
  public set Height(x: number) { this._size.y = x; this.markDirty(); }

  public constructor(wv:WorldView25D){
    this._worldView=wv;
  }
  public copy(other: Object25D) {
    this._worldView = other._worldView;
    this._dirty = other._dirty;
    this._destroyed = other._destroyed;
    this._location = other._location.clone();
    this._rotation = other._rotation.clone();
    this._scale = other._scale.clone();
    this._size = other._size.clone();

    for (let ci = 0; ci < other._children.length; ci++) {
      //TODO: make sure these callsa re calling sublcass methods.
      this._children.push(other._children[ci].clone());
    }
  }
  public clone(): Object25D {
    let ret = new Object25D(this.WorldView);
    ret.copy(this);
    return this;
  }
  public update(dt: number) {
    //Update kids
    for (let ci = 0; ci < this._children.length; ++ci) {
      this._children[ci].update(dt);
    }
  }
  public destroy() {
    this._worldView.destroy(this);
    for (let ci = 0; ci < this._children.length; ++ci) {
      this._children[ci].destroy();
    }    
  }
  public markDirty() {
    for (let ci = 0; ci < this._children.length; ++ci) {
      this._children[ci].markDirty();
    }
  }
}
//A tile that has no animation data
//All tile objects are registered in the buffer regardless of whether they are visible.  This needs to be changed.
class Tile25D extends Object25D {
  private _frame: SpriteFrame = null;
  private _bufferOffset: number = 0; // The offset of this tile in the tile buffer

  public get Frame(): SpriteFrame { return this._frame; }
  public set Frame(x: SpriteFrame) { this._frame = x; }
  public get BufferOffset(): number { return this._bufferOffset; }
  public set BufferOffset(x: number) { this._bufferOffset = x; }

  public constructor(wv:WorldView25D){
    super(wv);
    
    //Add a tile25
    this.WorldView.Buffer.add(this);

  }
  public copy(other: Tile25D) {
    super.copy(other);
    this._frame = other._frame;
    this._bufferOffset = other._bufferOffset;
  }
  public clone(): Tile25D {
    let ret = new Tile25D();
    ret.copy(this);
    return this;
  }
  public update(dt: number) {
    super.update(dt);
  }
  public markDirty() {
    super.markDirty();
    this.WorldView.markDirty(this);
  }

}
//A sub-image of a texture.
class SpriteFrame {
  //Technically we should allow multiple textures and batching, but for now, just one texture.
  public x: number = 0;
  public y: number = 0;
  public w: number = 0;
  public h: number = 0;
}
enum SpriteKeyFrameInterpolation {
  Linear //lerp
  , Step //Immediate
}
class SpriteKeyFrame {
  public _parent: SpriteAnimationData = null;//MUST SET
  public _frame: SpriteFrame = null; //The frame the sprite gets set to
  public _position: vec3 = new vec3(0, 0);
  public _rotation: Quaternion = new Quaternion(1, 0, 0, 0); //Axis/angle rotation
  public _scale: vec2 = new vec2(0, 0);
  public _visible: boolean = true;
  public _color: vec4 = new vec4(1, 1, 1, 1);
  public _duration: number = 0;
  public _transformInterpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Linear;
  public _imageInterpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Step;

  public get TransformInterpolation(): number { return this._transformInterpolation; }
  public set TransformInterpolation(x: number) { this._transformInterpolation = x; }
  public get ImageInterpolation(): number { return this._imageInterpolation; }
  public set ImageInterpolation(x: number) { this._imageInterpolation = x; }
  public get Duration(): number { return this._duration; }
  public set Duration(x: number) { this._duration = x; }
  public get Frame(): SpriteFrame { return this._frame; }
  public set Frame(x: SpriteFrame) { this._frame = x; }
  public get Position(): vec3 { return this._position; } //Relative to the sprite origin
  public set Position(x: vec3) { this._position = x; } //Relative to the sprite origin
  public get Rotation(): Quaternion { return this._rotation; } //Relative to the sprite origin
  public set Rotation(x: Quaternion) { this._rotation = x; } //Relative to the sprite origin
  public get Scale(): vec2 { return this._scale; } //Relative to the sprite origin
  public set Scale(x: vec2) { this._scale = x; } //Relative to the sprite origin
  public get Color(): vec4 { return this._color; } //Relative to the sprite origin
  public set Color(x: vec4) { this._color = x; } //Relative to the sprite origin
  public get Parent(): SpriteAnimationData { return this._parent; }

  public constructor(parent: SpriteAnimationData) {
    this._parent = parent;
  }
}
//Animation sequence for a single sprite component.
class SpriteAnimationData {
  private _name: string = "";
  private _lstKeyFrames: Array<SpriteKeyFrame> = new Array<SpriteKeyFrame>();

  public get Name(): string { return this._name; }
  public get KeyFrames(): Array<SpriteKeyFrame> { return this._lstKeyFrames; }
  public set KeyFrames(x: Array<SpriteKeyFrame>) { this._lstKeyFrames = x; }

  public constructor(name: string) {
    this._name = name;
  }
}
enum AnimationPlayback { Playing, Pauseed, Stopped }
//A sprite component. Arm/leg of a creature, etc.  Represents a single tile or image e.g. a quad.
class Sprite25D extends Tile25D {
  private _parent: Sprite25D = null;//MUST SET
  private _loop: boolean = false;
  private _animations: Map<string, SpriteAnimationData> = new Map<string, SpriteAnimationData>();//Shared -> Map of animation name to the data.
  private _curAnimation: SpriteAnimationData = null;
  private _animationTime: number = 0;
  private _animationSpeed: number = 1;//multiplier
  private _playback: AnimationPlayback = AnimationPlayback.Stopped;

  public get AnimationTime(): number { return this._animationTime; }
  public set AnimationTime(x: number) { this._animationTime = x; }
  public get AnimationSpeed(): number { return this._animationSpeed; }
  public set AnimationSpeed(x: number) { this._animationSpeed = x; }
  public get Animations(): Map<string, SpriteAnimationData> { return this._animations; }
  public get Parent(): Sprite25D { return this._parent; }
  public get Loop(): boolean { return this._loop; }

  constructor(wv:WorldView25D, parent: Sprite25D = null) {
    super(wv);
    this._parent = parent;
  }
  public copy(other: Sprite25D) {
    super.copy(other);
    this._parent = other._parent;
    this._loop = other._loop;
    this._animations = other._animations; // this is a shallow copy.  Animation data is shared.
    this._curAnimation = other._curAnimation;
    this._animationTime = other._animationTime;
    this._animationSpeed = other._animationSpeed;
    this._playback = other._playback;
  }
  public clone(): Sprite25D {
    let ret = new Sprite25D(this.WorldView, this.Parent);
    ret.copy(this);
    return this;
  }  
  public update(dt: number) {
    super.update(dt);
    //Animate
    this.animate(dt);
  }
  public stop() {
    this._playback = AnimationPlayback.Stopped;
  }
  public play(animation_name: string = null) {
    if (animation_name === null) {
      if (this._curAnimation) {
        this._playback = AnimationPlayback.Playing;
      }
    }
    else {
      let d = this._animations.get(animation_name);
      if (d) {
        this._curAnimation = d;
        this._playback = AnimationPlayback.Playing;
      }
      else {
        Globals.logDebug("animation '" + animation_name + "' not found.");
      }
    }

  }
  public addAnimation(animation_name: string, tiles: Array<vec2>, duration: number, atlas: Atlas): SpriteAnimationData {
    let ret = new SpriteAnimationData(animation_name);

    //Create Tiles.
    let sw = atlas.TileWidth / atlas.ImageWidth;
    let sh = atlas.TileHeight / atlas.ImageHeight;
    for (let ti = 0; ti < tiles.length; ++ti) {
      let v = tiles[ti];

      let kf = new SpriteKeyFrame(ret);
      kf.Frame = new SpriteFrame();
      kf.Frame.x = (atlas.LeftPad + v.x * atlas.TileWidth) / atlas.ImageWidth;
      kf.Frame.y = (atlas.TopPad + v.y * atlas.TileHeight) / atlas.ImageHeight;
      kf.Frame.w = sw;
      kf.Frame.h = sh;

      ret.KeyFrames.push(kf);
    }

    return ret;
  }

  private animate(dt: number) {
    let anim = this._curAnimation;

    if (anim) {
      this._animationTime += dt * this._animationSpeed;
      let frameA: number = 0;
      let frameB: number = 0;
      let total_time: number = 0;
      let t01: number = 0; //[0,1]

      //Get frame a and b to interpolate
      for (let ki = 0; ki < anim.KeyFrames.length; ++ki) {
        let key = anim.KeyFrames[ki];
        let next_time = total_time + key.Duration;

        if (this._animationTime < next_time) {
          frameA = (ki === 0) ? 0 : ki - 1;
          frameB = (ki == anim.KeyFrames.length - 1) ? -1 : frameA + 1;
          t01 = (this._animationTime - total_time) / (next_time - total_time)
          break;
        }
        total_time += key.Duration;
      }

      if (frameB === -1) {
        if (this._loop) {
          frameB = 0;
        }
      }
      let keyA = anim.KeyFrames[frameA];
      if (frameB !== -1) {
        let keyB = anim.KeyFrames[frameB];

        if (keyB.TransformInterpolation === SpriteKeyFrameInterpolation.Linear) {
          let p = keyA.Position.clone().lerp(keyB.Position, t01);
          let s = keyA.Scale.clone().lerp(keyB.Scale, t01);
          let r = keyA.Rotation.clone().slerp(keyB.Rotation, t01);

          if (this.Parent) {
            p.add(this.Parent.Position);
            s.multiply(this.Parent.Scale);
            r.multiply(this.Parent.Rotation);
          }

          this.Position = p;
          this.Scale = s;
          this.Rotation = r;
        }
      }
      //TODO: image interpolation
      //if(keyB.ImageInterpolation === SpriteKeyFrameInterpolation.Linear){
      this.Frame = keyA.Frame;
      //}

    }
  }
}
//Somewhat Optimized buffer for rendering quads
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

    this.setDrawRange(0, 0);

    this.fillDefault();

    this._attrPosition = new THREE.BufferAttribute(this._verts, this._vsiz);
    this._attrNormal = new THREE.BufferAttribute(this._norms, this._nsiz);
    this._attrColor = new THREE.BufferAttribute(this._colors, this._csiz);
    this._attrTexture = new THREE.BufferAttribute(this._texs, this._tsiz);

    this.addAttribute('position', this._attrPosition);
    this.addAttribute('normal', this._attrNormal);
    this.addAttribute('color', this._attrColor);
    this.addAttribute('uv', this._attrTexture);

    //Threejs uses CCW default winding https://threejs.org/docs/#api/en/constants/Renderer
    let indexes = new Array<number>/*Int16Array*/(numTiles * 6);
    for (let ii = 0, tt = 0; ii < numTiles * 6; ii += 6) {
      let tvoff = ii / 6 * 4;

      indexes[ii + 0] = tvoff + 0;
      indexes[ii + 1] = tvoff + 2;
      indexes[ii + 2] = tvoff + 1;

      indexes[ii + 3] = tvoff + 1;
      indexes[ii + 4] = tvoff + 2;
      indexes[ii + 5] = tvoff + 3;
    }

    this.setIndex(indexes);
  }
  public update() {
    this.copyTiles();//Copy or clear tile data
    this.destroyTiles();//Remove tile from array
  }
  public add(tile: Tile25D) {
    for (let i = 0; i < this._tiles.length; ++i) {
      if (this._tiles[i] === null) {
        this._tiles[i] = tile;
        tile.BufferOffset = i;

        //Really, this is suboptimal, we need to use the maximum filled buffer slot
        if (i + 1 > this._usedBufferLengthTiles) {
          this._usedBufferLengthTiles = i + 1;
        }
        break;
      }
    }

    this.markDirty(tile);
    this.updateBufferRange();
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

  private fillDefault() {
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
    this.setDrawRange(0, 6);
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
  private destroyTiles() {
    if (this._destroyed.length > 0) {
      //Update Destroyed
      for (let i = 0; i < this._destroyed.length; ++i) {
        let off: number = this._tiles[i].BufferOffset;
        this._tiles[off] = null;
      }
      this._destroyed = new Array<Tile25D>();
    }
  }
  private copyTiles() {
    //If tiles were changed or we have destroyed some tiles.
    if (this._dirty.length > 0 || this._destroyed.length > 0) {

      //Update Dirty
      for (let i = 0; i < this._dirty.length; ++i) {
        this.copyTile(this._tiles[i], false);
      }
      for (let i = 0; i < this._destroyed.length; ++i) {
        this.copyTile(this._tiles[i], true);
      }
      this._attrPosition.needsUpdate = true;

      // //If normal and color don't change we don't really  need update the
      this._attrNormal.needsUpdate = true;
      this._attrColor.needsUpdate = true;
      this._attrTexture.needsUpdate = true;

      this.computeBoundingBox();
      this.computeBoundingSphere();
    }
  }
  private copyTile(tile: Tile25D, clear: boolean) {
    //Specify clear to clear the tile's position and essentially hide it.
    //Essentially there won't be too many cleared tiles, I suspect that particles would be the only reason.
    //you can check if a tile was cleared with tile.Destroyed or null in the tiles array
    let v: Array<vec3> = new Array<vec3>(4);
    let t: Array<vec2> = new Array<vec2>(4);

    let off: number = tile.BufferOffset * 4;
    /*
    0 --- 1
    2 --- 3
    */
    if (clear) {
      v[0] = v[1] = v[2] = v[3] = new vec3(Infinity, Infinity, Infinity);
    }
    else {
      v[0] = tile.Position.clone().add(this._view.position); // relative to the 2D view.
      v[1] = v[0].clone().add(this._view.Right.clone().multiplyScalar(tile.Width));
      v[2] = v[0].clone().add(this._view.Down.clone().multiplyScalar(tile.Height));
      v[3] = v[2].clone().add(this._view.Right.clone().multiplyScalar(tile.Width));
    }

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
    this._texs[off * 2 + 0] = 0;
    this._texs[off * 2 + 1] = 1;

    this._texs[off * 2 + 2] = 1;
    this._texs[off * 2 + 3] = 1;

    this._texs[off * 2 + 4] = 0;
    this._texs[off * 2 + 5] = 0;

    this._texs[off * 2 + 6] = 1;
    this._texs[off * 2 + 7] = 0;

    tile.Dirty = false;
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

  private _boxHelper: THREE.BoxHelper = null;
  private _mesh: THREE.Mesh = null;

  private _objects: Array<Object25D> = new Array<Object25D>();
  private _destroyed: Array<Object25D> = new Array<Object25D>();

  public constructor(tilesw: number, tilesh: number, tilew: number, tileh: number, r: Atlas) {
    super();

    this._tilesWidth = tilesw;
    this._tilesHeight = tilesh;
    this._tileWidth = tilew;
    this._tileHeight = tileh;

    //This is a default junk
    this.Atlas = r;

    this._buffer = new TileBuffer(this._tilesWidth * this._tilesHeight * 4, this);

    let mat = new THREE.MeshBasicMaterial({
      color: 0xffffff
      , side: THREE.FrontSide
      , map: r.Texture
      , vertexColors: THREE.VertexColors
      , flatShading: true
      , transparent: true
      , wireframe: false
      , alphaTest: 0.01
    });

    this._mesh = new THREE.Mesh(this._buffer, mat);

    this.add(this._mesh);
  }
  public destroy(tile: Object25D) {
    this._destroyed.push(tile);
    tile.Destroyed = true;
  }
  public markDirty(t: Tile25D) {
    this._buffer.markDirty(t);
  }
  public update(dt: number) {
    //Update the plane information
    this.updatePlane();
    this._buffer.update();

    if (Globals.isDebug()) {
      if (this._boxHelper !== null) {
        this.remove(this._boxHelper);
      }
      this._boxHelper = new THREE.BoxHelper(this._mesh, new THREE.Color(0xffff00));
      this.add(this._boxHelper);
    }

    this.destroyObjects();
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
  private destroyObjects() {
    //This maka no sense
    if (this._destroyed.length > 0) {
      //Update Destroyed
      for (let obi = this._objects.length - 1; obi >= 0; obi--) {
        for (let obj = this._destroyed.length - 1; obj >= 0; obj--) {
          if (this._objects[obi] === this._destroyed[obj]) {
            this._destroyed.splice(obj, 1);
            this._objects.splice(obi, 1);
            break;
          }
        }
      }
      this._destroyed = new Array<Object25D>();
    }
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

  let r = new Atlas(1, 1, 16, 16, './dat/img/sprites.png');

  //Addijng 2 just cuz
  let w = new WorldView25D(10, 7, 1, 1, r);
  w.position.z = -2;
  g_world.addView(w);

  let w2 = new WorldView25D(10, 7, 1, 1, r);
  w2.position.z = 2;
  g_world.addView(w2);

  Globals.scene.add(g_world);

  function defineSpriteAnimation(name: string, xys: Array<vec2>, atlas: Atlas): SpriteAnimationData {


  }

  // let ob = new SpriteObjectData();
  // let anim = new SpriteAnimationData();
  // anim.Name = "walk-left";
  // let kf0 = new SpriteKeyFrame();
  // kf0.Frame = new SpriteFrame();
  // kf0.Frame.x
  // anim.KeyFrames.push(kf0);

  // ob.Animations.push(anim);

  // let spr = new Sprite25D(ob);

  let t = new Tile25D();
  t.TileXY = new vec2(0, 0);
  w.Buffer.add(t);

  for (let xx = 0; xx < 20; ++xx) {
    t = new Tile25D();
    t.TileXY = new vec2(0, 0);
    t.Position.x = Random.float(-5, 5);
    t.Position.y = Random.float(-5, 5);
    t.Size.x = Random.float(-5, 5);
    t.Size.y = Random.float(-5, 5);
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
