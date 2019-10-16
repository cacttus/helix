import * as THREE from 'three';
import {
  Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D,
  AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, MeshPhongMaterial, BufferAttribute, Quaternion, ObjectSpaceNormalMap, Float32Attribute
} from 'three';
import { Globals, GameState } from './Globals';
import { basename } from 'upath';
import { Utils } from './Utils';
import { Random } from './Base';

import vec3 = THREE.Vector3;
import vec2 = THREE.Vector2;
import vec4 = THREE.Vector4;
import mat4 = THREE.Matrix4;
class ivec2 {
  public x: number = 0 | 0;
  public y: number = 0 | 0;
}

interface AfterLoadFunction { (x: any): void; };

class ImageResource {
  private _location: string = "";
  public get Location(): string { return this._location; }
  //[Jsonignore]
  public Texture: THREE.Texture = null;
  public Name: string = "";
  public Id: number = -1;

  public load(loc: string, afterLoad: AfterLoadFunction) {
    this._location = loc;

    let that = this;
    //THREE.ImageUtils.loadTexture(loc), transparent: true, opacity: 0.5, color: 0xFF0000 }))
    this.Texture = new THREE.TextureLoader().load(loc, function (tex) {
      if (afterLoad) {
        afterLoad(that);
      }
    });
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
  private _rightPad: number = 1;
  private _botPad: number = 1;

  private _xSpace: number = 1;  //Pixel Space between frames.
  private _ySpace: number = 1;

  private _tileWidth: number = 16;
  private _tileHeight: number = 16;

  //Number of frames across the atlas.
  public get FramesWidth(): number {
    return ((this.ImageWidth - this.RightPad - this.LeftPad + this.SpaceX) / (this.TileWidth + this.SpaceX)) | 0;
  }
  public get FramesHeight(): number {
    return ((this.ImageHeight - this.BotPad - this.TopPad + this.SpaceY) / (this.TileHeight + this.SpaceY)) | 0;
  }

  public get ImageWidth(): number {
    let w = this.Texture.image.width;
    return w;
  }
  public get ImageHeight(): number {
    let h = this.Texture.image.height;
    return h;
  }

  public get TopPad(): number { return this._topPad; }
  public get LeftPad(): number { return this._leftPad; }
  public get RightPad(): number { return this._rightPad; }
  public get BotPad(): number { return this._botPad; }
  public get SpaceX(): number { return this._xSpace; }
  public get SpaceY(): number { return this._ySpace; }
  public get TileWidth(): number { return this._tileWidth; }
  public get TileHeight(): number { return this._tileHeight; }

  public constructor(top: number, left: number, right: number, bot: number, xSpace: number, ySpace: number, tile_w: number, tile_h: number, tex: string, afterLoad: AfterLoadFunction) {
    super();
    this._topPad = top;
    this._leftPad = left;
    this._rightPad = right;
    this._botPad = bot;

    this._xSpace = xSpace;
    this._ySpace = ySpace;

    this._tileWidth = tile_w;
    this._tileHeight = tile_h;

    this.load(tex, afterLoad);
  }
}
//A sub-image of a texture.
class SpriteFrame {
  //Technically we should allow multiple textures and batching, but for now, just one texture.
  public x: number = 0;
  public y: number = 0;
  public w: number = 0;
  public h: number = 0;
  public shrink(amt: number) {
    //Add a slight margin to this frame in order to prevent small amounts of texture error.  Works well for pixel level textures with nearest filtering.
    this.x += amt;
    this.y += amt;
    this.w -= amt * 2;
    this.h -= amt * 2;
  }
}
enum SpriteKeyFrameInterpolation { Linear, Step }
//Keyframe for animation
class SpriteKeyFrame {
  public _parent: SpriteAnimationData = null;//MUST SET
  public _frame: SpriteFrame = null; //The frame the sprite gets set to
  public _position: vec3 = new vec3(0, 0);
  public _rotation: Quaternion = new Quaternion(1, 0, 0, 0); //Axis/angle rotation
  public _scale: vec2 = new vec2(1, 1);
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

  private _duration: number = 0;

  public get Duration(): number { return this._duration; }
  public get Name(): string { return this._name; }
  public get KeyFrames(): Array<SpriteKeyFrame> { return this._lstKeyFrames; }
  public set KeyFrames(x: Array<SpriteKeyFrame>) { this._lstKeyFrames = x; }

  public calcDuration() {
    this._duration = 0;
    for (let kf of this._lstKeyFrames) {
      this._duration += kf.Duration;
    }
  }

  public constructor(name: string) {
    this._name = name;
  }
}
enum AnimationPlayback { Playing, Pauseed, Stopped }
enum DirtyFlag { Transform = 0x01, UVs = 0x02, Normals = 0x04, Colors = 0x08, All = 0x01 | 0x02 | 0x04 | 0x08 }
//A sprite component. Arm/leg of a creature, etc.  Represents a single tile or image e.g. a quad.
class Sprite25D {
  private static _idGen = 1; // Do not clone
  private _uniqueId: number = 0;// DO NOT CLONE
  private _worldView: WorldView25D = null; // Do not clone
  private _dirty: boolean = false;// Do not clone MUST default to false.  
  private _destroyed: boolean = false; // Do not clone

  private _location: vec3 = new vec3(0, 0, 0);
  private _rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _scale: vec2 = new vec2(1, 1);
  private _animated_location: vec3 = new vec3(0, 0, 0);
  private _animated_rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _animated_scale: vec2 = new vec2(1, 1);

  private _size: vec2 = new vec2(1, 1); // this is actual size of geometry
  private _origin: vec3 = new vec3(0, 0, 0);
  private _children: Array<Sprite25D> = new Array<Sprite25D>();
  private _parent: Sprite25D = null; // Do not clone
  private _visible: boolean = true;
  private _dirtyFlags: number = 0 | 0; // Do not clone

  private _frame: SpriteFrame = null;
  private _bufferOffset: number = -1; //Do not clone. // The offset of this tile in the tile buffer, -1 = not rendered

  private _loop: boolean = true;
  private _animations: Map<string, SpriteAnimationData> = new Map<string, SpriteAnimationData>();//Shared -> Map of animation name to the data.
  private _curAnimation: SpriteAnimationData = null;
  private _animationTime: number = 0;
  private _animationSpeed: number = 1;//multiplier
  private _playback: AnimationPlayback = AnimationPlayback.Stopped;

  public get UniqueId(): number { return this._uniqueId; }
  public get Origin(): vec3 { return this._origin; }
  public get DirtyFlags(): number { return this._dirtyFlags; }
  public get Visible(): boolean { return this._visible; }
  public set Visible(x: boolean) {
    if (this._visible !== x) {
      this.markDirty();
    }
    this._visible = x;
  }
  public get Parent(): Sprite25D { return this._parent; }
  public get Children(): Array<Sprite25D> { return this._children; }
  public get WorldView(): WorldView25D { return this._worldView; }
  public set WorldView(x: WorldView25D) { this._worldView = x; }

  public get Dirty(): boolean { return this._dirty; }

  public get Destroyed(): boolean { return this._destroyed; }
  public set Destroyed(x: boolean) { this._destroyed = x; }

  public get Position(): vec3 { return this._location; }
  public set Position(x: vec3) {
    if (this._location.x !== x.x ||
      this._location.y !== x.y ||
      this._location.z !== x.z) {
      this.markDirty();
    }
    this._location = x;
  }
  public get Rotation(): Quaternion { return this._rotation; }
  public set Rotation(x: Quaternion) {
    if (this._rotation.x !== x.x ||
      this._rotation.y !== x.y ||
      this._rotation.z !== x.z ||
      this._rotation.w !== x.w) {
      this.markDirty();
    }
    this._rotation = x;
  }
  public get Scale(): vec2 { return this._scale; }
  public set Scale(x: vec2) {
    if (this._scale.x !== x.x ||
      this._scale.y !== x.y) {
      this.markDirty();
    }
    this._scale = x;
  }

  //Tile versions are animated positions.  Not the position of this object.
  public get AnimatedPosition(): vec3 { return this._animated_location; }
  public set AnimatedPosition(x: vec3) {
    if (this._animated_location.x !== x.x ||
      this._animated_location.y !== x.y ||
      this._animated_location.z !== x.z) {
      this.markDirty();
    }
    this._animated_location = x;
  }
  public get AnimatedRotation(): Quaternion { return this._animated_rotation; }
  public set AnimatedRotation(x: Quaternion) {
    if (this._animated_rotation.x !== x.x ||
      this._animated_rotation.y !== x.y ||
      this._animated_rotation.z !== x.z ||
      this._animated_rotation.w !== x.w) {
      this.markDirty();
    }
    this._animated_rotation = x;
  }
  public get AnimatedScale(): vec2 { return this._animated_scale; }
  public set AnimatedScale(x: vec2) {
    if (this._animated_scale.x !== x.x ||
      this._animated_scale.y !== x.y) {
      this.markDirty();
    }
    this._animated_scale = x;
  }

  public get Size(): vec2 { return this._size; }
  public set Size(x: vec2) {
    if (this._size.x !== x.x || this._size.y !== x.y) {
      this.markDirty();
    }
    this._size = x;
  }
  public get Width(): number { return this._size.x; }
  public set Width(x: number) {
    if (this._size.x != x) {
      this.markDirty();
    }
    this._size.x = x;
  }
  public get Height(): number { return this._size.y; }
  public set Height(x: number) {
    if (this._size.y !== x) {
      this.markDirty();
    }
    this._size.y = x;
  }
  public get Frame(): SpriteFrame { return this._frame; }
  public set Frame(x: SpriteFrame) {
    if (this._frame !== x) {
      this.markDirty();
    }
    this._frame = x;
  }
  public get BufferOffset(): number { return this._bufferOffset; }
  public set BufferOffset(x: number) { this._bufferOffset = x; }

  public get AnimationTime(): number { return this._animationTime; }
  public set AnimationTime(x: number) { this._animationTime = x; }
  public get AnimationSpeed(): number { return this._animationSpeed; }
  public set AnimationSpeed(x: number) { this._animationSpeed = x; }
  public get Animations(): Map<string, SpriteAnimationData> { return this._animations; }
  public get Loop(): boolean { return this._loop; }

  public constructor() {
    this._uniqueId = Sprite25D._idGen++;
  }

  public copy(other: Sprite25D) {
    //We do not clone every member, see comments above.
    this._location = other._location.clone();
    this._rotation = other._rotation.clone();
    this._scale = other._scale.clone();
    this._size = other._size.clone();
    this._origin = other._origin.clone();

    for (let ci = 0; ci < other._children.length; ci++) {
      this._children.push(other._children[ci].clone());
    }
    this._visible = other._visible;

    this._frame = other._frame;

    this._loop = other._loop;
    this._animations = other._animations; // this is a shallow copy.  Animation data is shared.
    this._curAnimation = other._curAnimation;
    this._animationTime = other._animationTime;
    this._animationSpeed = other._animationSpeed;
    this._playback = other._playback;
  }
  public clone(): Sprite25D {
    let ret = new Sprite25D();
    ret.copy(this);
    return ret;
  }
  public update(dt: number) {
    this.animate(dt);

    for (let ci = 0; ci < this._children.length; ++ci) {
      this._children[ci].update(dt);
    }
  }
  public add(ob: Sprite25D) {
    this._children.push(ob);
    ob._parent = this;
  }
  public remove(ob: Sprite25D) {
    for (let i = 0; i < this._children.length; i--) {
      if (this._children[i] === ob) {
        this._children.splice(i, 1);
        ob._parent = null;
        break;
      }
    }
  }
  public destroy() {
    if (this.WorldView) {
      this.WorldView.destroyObject25(this);
      for (let ci = 0; ci < this._children.length; ++ci) {
        this._children[ci].destroy();
      }
    }
  }
  public markDirty(flags: number = DirtyFlag.All) {
    if (this._dirty === false) {
      if (this.WorldView) {
        this._dirty = true;
        this._dirtyFlags |= flags;
        this.WorldView.markDirty(this);
      }
    }
  }
  public clearDirty() {
    this._dirty = false;
    this._dirtyFlags = 0;
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
        //not found.
      }
    }

    for (const c of this.Children) {
      c.play(animation_name);
    }
  }
  public addAnimation(animation_name: string, tiles: Array<ivec2>, duration: number, atlas: Atlas): SpriteAnimationData {
    let ret = new SpriteAnimationData(animation_name);

    //Create Tiles.
    let sw = atlas.TileWidth / atlas.ImageWidth;
    let sh = atlas.TileHeight / atlas.ImageHeight;
    for (let ti = 0; ti < tiles.length; ++ti) {
      let v = tiles[ti];

      let kf = new SpriteKeyFrame(ret);
      kf.Frame = new SpriteFrame();
      kf.Frame.x = (atlas.LeftPad + v.x * (atlas.TileWidth + atlas.SpaceX)) / atlas.ImageWidth;
      //Tex is in gl coords from bot left corner. so 0,0 is actually 0,h-1
      kf.Frame.y = 1 - (atlas.TopPad + v.y * (atlas.TileHeight + atlas.SpaceY)) / atlas.ImageHeight - sh;
      kf.Frame.w = sw;
      kf.Frame.h = sh;

      kf.Frame.shrink(0.0001);

      kf.Duration = duration / tiles.length;

      ret.KeyFrames.push(kf);
    }
    this.Animations.set(animation_name, ret);

    ret.calcDuration();

    return ret;
  }

  private animate(dt: number) {
    let anim = this._curAnimation;

    if (anim) {
      if (anim.KeyFrames.length > 0) {
        this._animationTime += dt * this._animationSpeed;

        let ob = this.getFrames(anim);
        let kflen = this._curAnimation.KeyFrames.length;
        if (ob.frameA >= 0 &&
          ob.frameA <= kflen &&
          ob.frameB >= 0 &&
          ob.frameB <= kflen) {

          let keyA = anim.KeyFrames[ob.frameA];
          let keyB = anim.KeyFrames[ob.frameB];
          this.interpolateFrames(keyA, keyB, ob.t01);
        }

      }//anim.keyframes.length > 0
    }//if(anim)

  }
  private getFrames(anim: SpriteAnimationData): any {
    //Return value is an object.
    let ob: any = { frameA: -1, frameB: -1, t01: 0.0 };

    let total_time: number = 0;

    //Get frame a and b to interpolate
    for (let ki = 0; ki < anim.KeyFrames.length; ++ki) {
      let key = anim.KeyFrames[ki];
      let next_time = total_time + key.Duration;

      if (this._animationTime < next_time) {
        ob.frameA = ki;
        ob.t01 = (this._animationTime - total_time) / (next_time - total_time)
        break;
      }
      total_time += key.Duration;
    }

    if (ob.frameA === -1) {
      if (this._loop) {
        ob.frameA = 0;
        this._animationTime = 0;
      }
      else {
        ob.frameA = anim.KeyFrames.length - 1;
        this._animationTime = anim.Duration;
      }
    }

    ob.frameB = ob.frameA + 1;
    if (ob.frameB >= anim.KeyFrames.length) {
      if (this._loop) {
        ob.frameB = 0;
      }
      else {
        ob.frameB = ob.frameA;
      }
    }

    return ob;
  }
  private interpolateFrames(keyA: SpriteKeyFrame, keyB: SpriteKeyFrame, t01: number) {
    if (keyB.TransformInterpolation === SpriteKeyFrameInterpolation.Linear) {
      let p = keyA.Position.clone().lerp(keyB.Position, t01);
      let s = keyA.Scale.clone().lerp(keyB.Scale, t01);
      let r = keyA.Rotation.clone().slerp(keyB.Rotation, t01);

      if (this.Parent) {
        p.add(this.Parent.Position);
        s.multiply(this.Parent.Scale);
        r.multiply(this.Parent.Rotation);
      }

      this.AnimatedPosition = p;
      this.AnimatedScale = s;
      this.AnimatedRotation = r;
    }
    //TODO: image interpolation
    //if(keyB.ImageInterpolation === SpriteKeyFrameInterpolation.Linear){
    this.Frame = keyA.Frame;
    //}
  }


}
//Somewhat Optimized buffer for rendering quads
class TileBuffer extends THREE.BufferGeometry {

  private _bufferSizeTiles: number = 0;

  //Note: the _tiles array allocation matches the buffer array.  It's sort of a slot map.
  private _tiles: Array<Sprite25D> = new Array<Sprite25D>();
  // private _destroyed: Array<Tile25D> = new Array<Tile25D>();
  //private _dirty: Array<Tile25D> = new Array<Tile25D>();

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

  private _updFlags: number = 0;

  //public get Tiles(): Array<Tile25D> { return this._tiles; }

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


    //The tiles array matches the buffer.  it's initialized to null to indicate that this buffer slot is not taken.
    this._tiles = new Array<Sprite25D>(numTiles);
    for (let i = 0; i < this._tiles.length; ++i) {
      this._tiles[i] = null;
    }

    this.setDrawRange(0, 0);

    let verts: Float32Array = new Float32Array(numTiles * 4 * this._vsiz);
    let norms: Float32Array = new Float32Array(numTiles * 4 * this._nsiz);
    let colors: Float32Array = new Float32Array(numTiles * 4 * this._csiz);
    let texs: Float32Array = new Float32Array(numTiles * 4 * this._tsiz);

    this.fillDefault(verts, texs, norms, colors);

    this._attrPosition = new THREE.BufferAttribute(verts, this._vsiz);
    this._attrNormal = new THREE.BufferAttribute(norms, this._nsiz);
    this._attrColor = new THREE.BufferAttribute(colors, this._csiz);
    this._attrTexture = new THREE.BufferAttribute(texs, this._tsiz);

    this._attrPosition.setDynamic(true);
    this._attrNormal.setDynamic(true);
    this._attrColor.setDynamic(true);
    this._attrTexture.setDynamic(true);

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
  public addTile(tile: Sprite25D) {
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
    tile.markDirty(DirtyFlag.All);
    this.updateBufferRange();
  }
  public removeTile(tile: Sprite25D) {
    if (tile.BufferOffset !== -1) {
      //if -1 then the tile was not added.
      let off: number = tile.BufferOffset;
      this._tiles[off] = null;
    }

    tile.Destroyed = true;
  }
  public beginCopy() {
    this._updFlags = 0;
  }
  public endCopy() {
    let p: boolean = (this._updFlags & DirtyFlag.Transform) > 0;
    let n: boolean = (this._updFlags & DirtyFlag.Normals) > 0;
    let c: boolean = (this._updFlags & DirtyFlag.Colors) > 0;
    let t: boolean = (this._updFlags & DirtyFlag.UVs) > 0;

    //(this.attributes['position'] as BufferAttribute).needsUpdate = p;
    //(this.attributes['normal'] as BufferAttribute).needsUpdate = n;
    //(this.attributes['color'] as BufferAttribute).needsUpdate = c;
    //(this.attributes['uv'] as BufferAttribute).needsUpdate = t;
    this._attrPosition.needsUpdate = p;
    this._attrNormal.needsUpdate = n;
    this._attrColor.needsUpdate = c;
    this._attrTexture.needsUpdate = t;

    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
  public copyTile(tile: Sprite25D, clear: boolean = false) {
    //Specify clear to clear the tile's position and essentially hide it.
    //Essentially there won't be too many cleared tiles, I suspect that particles would be the only reason.
    //you can check if a tile was cleared with tile.Destroyed or null in the tiles array

    if (tile.BufferOffset === -1) {
      //Register new tile.
      this.addTile(tile);
    }

    let v: Array<vec3> = new Array<vec3>(4);
    let t: Array<vec2> = new Array<vec2>(4);
    let off: number = tile.BufferOffset * 4;


    let flags = tile.DirtyFlags;
    this._updFlags |= tile.DirtyFlags;
    /*
    0 --- 1
    2 --- 3
    */
    if (clear) {
      v[0] = v[1] = v[2] = v[3] = new vec3(Infinity, Infinity, Infinity);
    }
    else if (flags & DirtyFlag.Transform) {
      //Translate tile with origin.
      let tilepos_translated: vec3 = tile.Position.clone().add(tile.AnimatedPosition).add(tile.Origin);

      //Position the image relative to the world grid's basis
      let tilepos_local: vec3 = this._view.Right.clone().multiplyScalar(tilepos_translated.x);
      tilepos_local.add(this._view.Down.clone().multiplyScalar(tilepos_translated.y));
      tilepos_local.add(this._view.Normal.clone().multiplyScalar(tilepos_translated.z));

      v[0] = this._view.position.clone().add(tilepos_local);
      v[1] = v[0].clone().add(this._view.Right.clone().multiplyScalar(tile.Width * tile.Scale.x * tile.AnimatedScale.x));
      v[2] = v[0].clone().add(this._view.Down.clone().multiplyScalar(tile.Height * tile.Scale.y * tile.AnimatedScale.y));
      v[3] = v[2].clone().add(this._view.Right.clone().multiplyScalar(tile.Width * tile.Scale.x * tile.AnimatedScale.x));
    }

    let verts: Float32Array = (this._attrPosition.array as Float32Array);
    let norms: Float32Array = (this._attrNormal.array as Float32Array);
    let colors: Float32Array = (this._attrColor.array as Float32Array);
    let uvs: Float32Array = (this._attrTexture.array as Float32Array);

    for (let vi = 0; vi < 4; ++vi) {
      let vv = off + vi;

      if (flags & DirtyFlag.Transform) {
        verts[vv * this._vsiz + 0] = v[vi].x;
        verts[vv * this._vsiz + 1] = v[vi].y;
        verts[vv * this._vsiz + 2] = v[vi].z;
      }
      if (flags & DirtyFlag.Normals) {
        norms[vv * this._nsiz + 0] = this._view.Normal.x;
        norms[vv * this._nsiz + 1] = this._view.Normal.y;
        norms[vv * this._nsiz + 2] = this._view.Normal.z;
      }
      if (flags & DirtyFlag.Colors) {
        colors[vv * this._csiz + 0] = 1;
        colors[vv * this._csiz + 1] = 1;
        colors[vv * this._csiz + 2] = 1;
        colors[vv * this._csiz + 3] = 1;
      }
    }

    if (flags & DirtyFlag.UVs) {
      if (tile.Frame) {

        let f = tile.Frame;
        let x0 = f.x;
        let y0 = f.y;
        let x1 = f.x + f.w;
        let y1 = f.y + f.h;

        uvs[off * 2 + 0] = x0;
        uvs[off * 2 + 1] = y1;
        uvs[off * 2 + 2] = x1;
        uvs[off * 2 + 3] = y1;
        uvs[off * 2 + 4] = x0;
        uvs[off * 2 + 5] = y0;
        uvs[off * 2 + 6] = x1;
        uvs[off * 2 + 7] = y0;
      }
    }
  }
  private fillDefault(vb: Float32Array, tb: Float32Array, nb: Float32Array, cb: Float32Array) {
    vb[0] = 0;
    vb[1] = 0;
    vb[2] = 0;

    vb[3] = 1;
    vb[4] = 0;
    vb[5] = 0;

    vb[6] = 0;
    vb[7] = -1;
    vb[8] = 0;

    vb[9] = 1;
    vb[10] = -1;
    vb[11] = 0;

    tb[0] = 0;
    tb[1] = 1;
    tb[2] = 1;
    tb[3] = 1;
    tb[4] = 0;
    tb[5] = 0;
    tb[6] = 1;
    tb[7] = 0;

    for (let xx = 0; xx < 4; ++xx) {
      nb[xx * 3 + 0] = 0;
      nb[xx * 3 + 1] = 0;
      nb[xx * 3 + 2] = 1;
      cb[xx * 4 + 0] = 1;
      cb[xx * 4 + 1] = 0;
      cb[xx * 4 + 2] = 1;
      cb[xx * 4 + 3] = 1;
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


}
// This class is a viewport into the 2D game world.  
class WorldView25D extends Object3D {
  private _tilesWidth: number = 10;
  private _tilesHeight: number = 10;
  private _tileWidth: number = 1;
  private _tileHeight: number = 1;

  public Atlas: Atlas = null;

  private _buffer: TileBuffer = null;

  public Pos: vec3 = new vec3(0, 0, 0);
  public Normal: vec3 = new vec3(0, 0, 0);
  public Right: vec3 = new vec3(0, 0, 0);
  public Down: vec3 = new vec3(0, 0, 0);

  private _boxHelper: THREE.BoxHelper = null;
  private _mesh: THREE.Mesh = null;

  private _objects: Map<Sprite25D, Sprite25D> = new Map<Sprite25D, Sprite25D>(); // Objects that do not update.
  //private _objects_active: Map<Object25D, Object25D> = new Map<Object25D, Object25D>(); //Objects with active updates
  private _destroyed: Map<Sprite25D, Sprite25D> = new Map<Sprite25D, Sprite25D>();
  private _dirty: Map<Sprite25D, Sprite25D> = new Map<Sprite25D, Sprite25D>();

  public get Buffer(): TileBuffer { return this._buffer; }
  public get TilesWidth(): number { return this._tilesWidth; }
  public get TilesHeight(): number { return this._tilesHeight; }
  public get TileWidth(): number { return this._tileWidth; }
  public get TileHeight(): number { return this._tileHeight; }

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
      , side: THREE.DoubleSide
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
  public addObject25(ob: Sprite25D) {
    if (ob.Destroyed === false) {
      ob.WorldView = this;
      this._objects.set(ob, ob);
      ob.markDirty();
    }
  }
  public removeObject25(ob: Sprite25D) {
    if (ob.Destroyed === false) {
      ob.WorldView = null;
      this._objects.delete(ob);
    }
  }
  public destroyObject25(ob: Sprite25D) {
    this._destroyed.set(ob, ob);
    ob.Destroyed = true;
  }
  public markDirty(ob: Sprite25D) {
    this._dirty.set(ob, ob);
  }
  public update(dt: number) {
    //Update the plane information
    this.updatePlane();

    //Update Objects
    for (const [key, value] of this._objects) {
      //There may be a faster way to do this. For instance, static objects don't update.
      key.update(dt);
    }

    //Box
    if (Globals.isDebug()) {
      if (this._boxHelper !== null) {
        this.remove(this._boxHelper);
      }
      this._boxHelper = new THREE.BoxHelper(this._mesh, new THREE.Color(0xffff00));
      this.add(this._boxHelper);
    }

    //Dirty
    this._buffer.beginCopy();
    for (const [key, value] of this._dirty) {
      this.copyDirtyTileGeom(key);
    }
    this._buffer.endCopy();
    this._dirty.clear();

  }
  private copyDirtyTileGeom(ob: Sprite25D) {
    this._buffer.copyTile(ob, false);
    ob.clearDirty();

    for (let ci = 0; ci < ob.Children.length; ci++) {
      this.copyDirtyTileGeom(ob.Children[ci]);
    }
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

  loadResources();
});
let g_atlas: Atlas = null;
function loadResources() {
  //this should really be handled by a promise.
  g_atlas = new Atlas(1, 1, 1, 1, 1, 1, 12, 12, './dat/img/sprites.png', function () {
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

}
//Testing Yield / Async/Await & Promise
//Generator returns value & boolean whehter done.

function createWorld() {
  //Load Resources

  g_world = new WorldManager25D();

  //Addijng 2 just cuz
  let world = new WorldView25D(10, 7, 1, 1, g_atlas);
  world.position.z = -2;
  g_world.addView(world);
  Globals.scene.add(g_world);

  let sp = new Sprite25D();
  sp.addAnimation("walk", [new vec2(1, 0), new vec2(0, 0), new vec2(1, 0), new vec2(2, 0)], 1.1, g_atlas);
  // ob.add(sp);
  world.addObject25(sp);

  sp.play("walk");

  for (let i = 0; i < 20; i++) {
    let x1 = sp.clone();
    x1.play("walk");
    sp.Position.x = Random.float(-2, 2);
    sp.Position.y = Random.float(-2, 2);
    sp.Position.z = Random.float(0, 0.3);
    sp.AnimationSpeed = Random.float(0.8, 1.5);
    world.addObject25(x1);
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
