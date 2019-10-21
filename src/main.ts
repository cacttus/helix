import * as THREE from 'three';
import {
  Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D,
  AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, MeshPhongMaterial, BufferAttribute, Quaternion, ObjectSpaceNormalMap, Float32Attribute, NormalBlending, WrapAroundEnding
} from 'three';
import { Globals, GameState } from './Globals';
import { basename } from 'upath';
import { Utils } from './Utils';
import { Random, ModelManager, AfterLoadFunction, Frustum } from './Base';
import { vec2, vec3, vec4, mat3, mat4, ProjectedRay, Box2f, RaycastHit } from './Math';
import * as Files from './Files';
import {Int, roundToInt, toInt, checkIsInt, assertAsInt} from './Int';
import {TileGrid} from './TileGrid';

export class ImageResource {
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
export class Atlas extends ImageResource {
  /*
  This is the sprite sheet.

  So, once Monogame Toolkit is finished the textrue coords will be loaded manually from a packed texture.
  for now, we;re just using straight tiled textures.
  */
  private _topPad: Int = 1 as Int;
  private _leftPad: Int = 1 as Int;
  private _rightPad: Int = 1 as Int;
  private _botPad: Int = 1 as Int;

  private _xSpace: Int = 1 as Int;  //Pixel Space between frames.
  private _ySpace: Int = 1 as Int;

  private _tileWidth: Int = 16 as Int;
  private _tileHeight: Int = 16 as Int;

  //Number of frames across the atlas.
  public get FramesWidth(): Int {
    return ((this.ImageWidth - this.RightPad - this.LeftPad + this.SpaceX) / (this.TileWidth + this.SpaceX)) as Int;
  }
  public get FramesHeight(): Int {
    return ((this.ImageHeight - this.BotPad - this.TopPad + this.SpaceY) / (this.TileHeight + this.SpaceY)) as Int;
  }

  public get ImageWidth(): Int {
    let w = this.Texture.image.width;
    return w;
  }
  public get ImageHeight(): Int {
    let h = this.Texture.image.height;
    return h;
  }

  public get TopPad(): Int { return this._topPad; }
  public get LeftPad(): Int { return this._leftPad; }
  public get RightPad(): Int { return this._rightPad; }
  public get BotPad(): Int { return this._botPad; }
  public get SpaceX(): Int { return this._xSpace; }
  public get SpaceY(): Int { return this._ySpace; }
  public get TileWidth(): Int { return this._tileWidth; }
  public get TileHeight(): Int { return this._tileHeight; }

  public constructor(top: Int, left: Int, right: Int, bot: Int, xSpace: Int, ySpace: Int, tile_w: Int, tile_h: Int, tex: string, afterLoad: AfterLoadFunction) {
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
export class SpriteFrame {
  //A sub-image of a texture.
  //Technically we should allow multiple textures and batching, but for now, just one texture.
  public debug_tile_x: number = 0;  //The Tile X/Y.  This is for information purposes only and may not actually be usd.
  public debug_tile_y : number = 0;
  public x: number = 0; //Texture X/Y (NOT tile index)
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
export class FDef {
  //Quick Sprite Keyframe Definition
  p: vec2 = null;
  h: boolean = false;
  v: boolean = false;
  c: vec4 = null;
  image_interpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Step;

  public constructor(dp: vec2 = null, dh: boolean = null, dv: boolean = null, dc: vec4 = null, ii: SpriteKeyFrameInterpolation = null) {
    this.p = dp;
    this.h = dh;
    this.v = dv;
    this.c = dc;
    this.image_interpolation = ii;
  }
  public clone(): FDef {
    let f: FDef = new FDef();
    f.copy(this);
    return f;
  }
  public copy(other: FDef) {
    this.p = other.p ? other.p.clone() : null;
    this.h = other.h;
    this.v = other.v;
    this.c = other.c ? other.c.clone() : null;
    this.image_interpolation = other.image_interpolation;
  }
}
export enum SpriteKeyFrameInterpolation { Linear, Step }
export class SpriteKeyFrame {
  //Keyframe for animation
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
  public _colorInterpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Linear;
  public _flipH: boolean = false;
  public _flipV: boolean = false;

  public get FlipH(): boolean { return this._flipH; }
  public set FlipH(x: boolean) { this._flipH = x; }
  public get FlipV(): boolean { return this._flipV; }
  public set FlipV(x: boolean) { this._flipV = x; }
  public get TransformInterpolation(): number { return this._transformInterpolation; }
  public set TransformInterpolation(x: number) { this._transformInterpolation = x; }
  public get ImageInterpolation(): number { return this._imageInterpolation; }
  public set ImageInterpolation(x: number) { this._imageInterpolation = x; }
  public get ColorInterpolation(): number { return this._colorInterpolation; }
  public set ColorInterpolation(x: number) { this._colorInterpolation = x; }
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
export class SpriteAnimationData {
  //Animation sequence for a single sprite component.
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
export enum AnimationPlayback { Playing, Pauseed, Stopped }
class Animation25D {
  //Separate class to deal with animations and transitinos.  Just because Sprite25D was getting big.

  private _animated_location: vec3 = new vec3(0, 0, 0); // Animated attributes.  These are applied if there is animation on the object.
  private _animated_rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _animated_scale: vec2 = new vec2(1, 1);

  private _frame: SpriteFrame = null;
  private _frame2: SpriteFrame = null; //Second frame to blend to.
  private _frameBlend: number = 0; // blend amount for the given frame.

  private _loop: boolean = true;
  private _animations: Map<string, SpriteAnimationData> = new Map<string, SpriteAnimationData>();//Shared -> Map of animation name to the data.
  private _currentAnimation: SpriteAnimationData = null;
  private _animationTime: number = 0;
  private _animationSpeed: number = 1;//multiplier
  private _playback: AnimationPlayback = AnimationPlayback.Stopped;

  private _sprite: Sprite25D = null;

  public get Playback(): AnimationPlayback { return this._playback; }

  public get Sprite(): Sprite25D { return this._sprite; }
  public get AnimationTime(): number { return this._animationTime; }
  public set AnimationTime(x: number) { this._animationTime = x; }
  public get AnimationSpeed(): number { return this._animationSpeed; }
  public set AnimationSpeed(x: number) { this._animationSpeed = x; }
  public get Animations(): Map<string, SpriteAnimationData> { return this._animations; }
  public get Loop(): boolean { return this._loop; }

  //Tile versions are animated positions.  Not the position of this object.
  public get AnimatedPosition(): vec3 { return this._animated_location; }
  public set AnimatedPosition(x: vec3) { this._animated_location = x; }
  public get AnimatedRotation(): Quaternion { return this._animated_rotation; }
  public set AnimatedRotation(x: Quaternion) { this._animated_rotation = x; }
  public get AnimatedScale(): vec2 { return this._animated_scale; }
  public set AnimatedScale(x: vec2) { this._animated_scale = x; }
  public get CurrentAnimation(): SpriteAnimationData { return this._currentAnimation; }

  public get Frame(): SpriteFrame { return this._frame; }
  public set Frame(x: SpriteFrame) {
    if (this._frame !== x) {
      this.Sprite.markDirty(DirtyFlag.UVs);
    }
    this._frame = x;
  }
  public get Frame2(): SpriteFrame { return this._frame2; }
  public set Frame2(x: SpriteFrame) {
    if (this._frame2 !== x) {
      this.Sprite.markDirty(DirtyFlag.UVs);
    }
    this._frame2 = x;
  }
  public get FrameBlend(): number { return this._frameBlend; }
  public set FrameBlend(x: number) { this._frameBlend = x; }

  public constructor(sprite: Sprite25D) {
    this._sprite = sprite;
  }
  public copy(other: Animation25D) {

    this._loop = other._loop;
    this._animations = other._animations; // this is a shallow copy.  Animation data is shared.
    this._currentAnimation = other._currentAnimation;
    this._animationTime = other._animationTime;
    this._animationSpeed = other._animationSpeed;
    this._playback = other._playback;

    this._frame = other._frame;
    this._frame2 = other._frame2;
    this._frameBlend = other._frameBlend;

  }
  public clone(parent: Sprite25D): Animation25D {
    let ret: Animation25D = new Animation25D(parent);
    ret.copy(this);
    return ret;
  }


  public update(dt: number) {
    //Update Animation
    if (this.Playback === AnimationPlayback.Playing) {
      let anim = this._currentAnimation;

      if (anim) {
        if (anim.KeyFrames.length > 0) {
          this._animationTime += dt * this._animationSpeed;

          let ob = this.getFrames(anim);
          let kflen = this._currentAnimation.KeyFrames.length;
          if (ob.frameA >= 0 &&
            ob.frameA < kflen &&
            ob.frameB >= 0 &&
            ob.frameB < kflen) {

            let keyA = anim.KeyFrames[ob.frameA];
            let keyB = anim.KeyFrames[ob.frameB];
            this.interpolateKeyFrames(keyA, keyB, ob.t01);
          }
          else {
            Globals.logError("Animation keyframes out of bounds: " + anim.Name);
          }

        }//anim.keyframes.length > 0
      }//if(anim)
    }
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
  private interpolateKeyFrames(keyA: SpriteKeyFrame, keyB: SpriteKeyFrame, t01: number) {
    //KeyB can be null, in which case we just set the keyframe to be frame A and we ignore t01

    let p: vec3 = null;
    let r: Quaternion = null;
    let s: vec2 = null;
    let c: vec4 = null;

    if (keyB === null) {
      p = keyA.Position;
      s = keyA.Scale;
      r = keyA.Rotation;
      c = keyA.Color;
    }
    else {
      if (keyB.TransformInterpolation === SpriteKeyFrameInterpolation.Linear) {
        p = keyA.Position.clone().lerp(keyB.Position, t01);
        s = keyA.Scale.clone().lerp(keyB.Scale, t01);
        r = keyA.Rotation.clone().slerp(keyB.Rotation, t01);
      }
      else if (keyB.TransformInterpolation === SpriteKeyFrameInterpolation.Step) {
        p = keyA.Position;
        s = keyA.Scale;
        r = keyA.Rotation;
      }

      if (keyB.ColorInterpolation === SpriteKeyFrameInterpolation.Linear) {
        c = keyA.Color.clone().lerp(keyB.Color, t01);
      }
      else if (keyB.ColorInterpolation === SpriteKeyFrameInterpolation.Step) {
        c = keyA.Color;
      }
    }

    if (this.Sprite.Parent) {
      p.add(this.Sprite.Parent.Position);
      s.multiply(this.Sprite.Parent.Scale);
      r.multiply(this.Sprite.Parent.Rotation);
      c.x *= this.Sprite.Parent.Color.x; // Apply parent color
      c.y *= this.Sprite.Parent.Color.y;
      c.z *= this.Sprite.Parent.Color.z;
      c.w *= this.Sprite.Parent.Color.w;
    }

    this.AnimatedPosition = p;
    this.AnimatedScale = s;
    this.AnimatedRotation = r;
    this.Sprite.Color = c;
    this.Sprite.FlipH = keyA.FlipH;
    this.Sprite.FlipV = keyA.FlipV;

    //TODO: blended image interpolation
    if (keyB && keyB.ImageInterpolation === SpriteKeyFrameInterpolation.Linear) {
      this.Frame = keyA.Frame;
      this.Frame2 = keyB.Frame;
      this.FrameBlend = t01;
    }
    else {
      this.Frame = keyA.Frame;
      this.Frame2 = null;
      this.FrameBlend = 0;
    }
  }

  public setKeyFrame(frameIndex: number, anim: SpriteAnimationData = null, recursive: boolean = true) {
    let my_anim = anim;
    if (my_anim === null) {
      my_anim = this._currentAnimation;
    }
    //Sets the given keyframe data for the character.
    if (my_anim) {
      if (my_anim.KeyFrames.length > frameIndex) {
        let key = my_anim.KeyFrames[frameIndex];
        this.interpolateKeyFrames(key, null, 0);
      }
      else {
        Globals.logError("Tried to set invalid keyframe for obj " + this.Sprite.Name + " index : " + frameIndex);
      }
    }

    if (recursive) {
      for (const c of this.Sprite.Children) {
        c.Animation.setKeyFrame(frameIndex, anim, recursive);
      }
    }

  }
  public pause() {
    this._playback = AnimationPlayback.Stopped;
    for (const c of this.Sprite.Children) {
      c.Animation.pause();
    }
  }
  public play(animation_name: string = null, restart: boolean = true) {
    //if PreventRestart is true, then skip setting a new animation if the same animation is already playing.
    if (animation_name === null) {
      if (this._currentAnimation) {
        this._playback = AnimationPlayback.Stopped;
      }
      this._currentAnimation = null;
    }
    else if ((this.CurrentAnimation !== null) && (this.CurrentAnimation.Name === animation_name) && !restart) {
      //Do not play new animation.  It's already playing and we dont' want to interrupt.
      this._playback = AnimationPlayback.Playing;
    }
    else {
      let d = this._animations.get(animation_name);
      if (d) {
        this._currentAnimation = d;
        this._playback = AnimationPlayback.Playing;
      }
      else {
        //not found.
      }
    }

    for (const c of this.Sprite.Children) {
      c.Animation.play(animation_name);
    }
  }
  public addTiledAnimation(animation_name: string, frames: Array<FDef>, duration: number, atlas: Atlas, imageSize: vec2 = null) {
    //Frames should be the top left corner (root) of the animated image.
    for (let jtile = 0; jtile < imageSize.y; ++jtile) {
      for (let itile = 0; itile < imageSize.x; ++itile) {

        if (itile === 0 && jtile === 0) {
          this.Sprite.SubTile = new vec2(itile, jtile);
          //Root tile is tile 0,0
          //Add the animation to THIS sprite.
          this.addAnimation(animation_name, frames, duration, atlas);
        }
        else {
          //Get the given sub-tile sprite, or create and add it to this sprite.
          let sp: Sprite25D = this.Sprite.getSubTile(itile, jtile);
          if (sp === null) {
            sp = new Sprite25D();
            sp.SubTile = new vec2(itile, jtile);
            this.Sprite.add(sp);
          }

          sp.Animation.addAnimation(animation_name, frames, duration, atlas);
          sp.Position.set(this.Sprite.Position.x + itile * this.Sprite.Size.x, this.Sprite.Position.y + jtile * this.Sprite.Size.y, this.Sprite.Position.z);
        }

      }
    }
  }
  public addAnimation(animation_name: string, frames: Array<FDef>, duration: number, atlas: Atlas): SpriteAnimationData {
    let ret = new SpriteAnimationData(animation_name);

    //If we are a sub-tile animation, then add the parent sprite's sub-tile coordinates to the input animation.
    let sub_x = 0;
    let sub_y = 0;
    if(this.Sprite.SubTile){
      sub_x = this.Sprite.SubTile.x;
      sub_y = this.Sprite.SubTile.y;
    }

    //Create Tiles.
    let sw : number = Number(atlas.TileWidth) / Number(atlas.ImageWidth);
    let sh : number = Number(atlas.TileHeight) / Number(atlas.ImageHeight);
    for (let iframe = 0; iframe < frames.length; ++iframe) {
      let def: FDef = frames[iframe];

      let kf = new SpriteKeyFrame(ret);
      kf.Frame = new SpriteFrame();
      kf.Frame.x = (Number(atlas.LeftPad) + (def.p.x + sub_x) * Number(atlas.TileWidth + atlas.SpaceX)) / Number(atlas.ImageWidth);
      //Tex is in gl coords from bot left corner. so 0,0 is actually 0,h-1
      kf.Frame.y = 1 - (Number(atlas.TopPad) + (def.p.y + sub_y) * Number(atlas.TileHeight + atlas.SpaceY)) / Number(atlas.ImageHeight) - sh;
      kf.Frame.w = sw;
      kf.Frame.h = sh;
      kf.Frame.debug_tile_x = def.p.x + sub_x;
      kf.Frame.debug_tile_y = def.p.y + sub_y;
      kf.Frame.shrink(0.0001);

      kf.Color = def.c ? def.c : new vec4(1, 1, 1, 1);// Random.randomVec4(0, 1);
      kf.FlipH = def.h ? def.h : false;
      kf.FlipV = def.v ? def.v : false;

      kf.ImageInterpolation = def.image_interpolation;

      kf.Duration = duration / frames.length;

      ret.KeyFrames.push(kf);
    }
    this.Animations.set(animation_name, ret);

    ret.calcDuration();

    return ret;
  }
}
export enum DirtyFlag { /*Transform = 0x01,*/ UVs = 0x02, Normals = 0x04, Colors = 0x08, All = 0x01 | 0x02 | 0x04 | 0x08 }
class Sprite25D {
  private _subTile: vec2 = null; //If set, this tile is a collection of other subtiles.

  private static _idGen = 1; // Do not clone
  private _name: string = "";
  private _uniqueId: number = 0;// DO NOT CLONE
  private _worldView: WorldView25D = null; // Do not clone
  private _dirty: boolean = false;// Do not clone MUST default to false.  
  private _destroyed: boolean = false; // Do not clone

  private _location: vec3 = new vec3(0, 0, 0); // Location of the object (relative to parent or scene).  This is not animated.
  private _rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _scale: vec2 = new vec2(1, 1);

  private _size: vec2 = new vec2(1, 1); // this is actual size of geometry
  private _origin: vec3 = new vec3(0, 0, 0);
  private _children: Array<Sprite25D> = new Array<Sprite25D>();
  private _parent: Sprite25D = null; // Do not clone
  private _visible: boolean = true;
  private _dirtyFlags: number = 0 | 0; // Do not clone

  private _color: vec4 = new vec4(1, 1, 1, 1);
  public _flipH: boolean = false;
  public _flipV: boolean = false;
  public _animation: Animation25D = null;

  public get Animation(): Animation25D { return this._animation; }

  public get Name(): string { return this._name; }
  public set Name(x: string) { this._name = x; }

  //SubTile is used to make multi-tile animations.  In addTiledAnimation the subtile adds an x/y offset to the animation.
  //The sub-tile is a tile relative to a "root" Sprite of 0,0 and adds the keyframe offsets to this location.  
  //This is for multi-tiled sprite animations, for example a character that is 2 tiles high (ex. pokemon char sprite)
  public get SubTile(): vec2 { return this._subTile; }
  public set SubTile(x: vec2) { this._subTile = x; }

  public get Color(): vec4 { return this._color; }
  public set Color(x: vec4) { this._color = x; this.markDirty(DirtyFlag.Colors); }
  public get FlipH(): boolean { return this._flipH; }
  public set FlipH(x: boolean) { this._flipH = x; }
  public get FlipV(): boolean { return this._flipV; }
  public set FlipV(x: boolean) { this._flipV = x; }

  public get UniqueId(): number { return this._uniqueId; }
  public get Origin(): vec3 { return this._origin; }
  public get DirtyFlags(): number { return this._dirtyFlags; }
  public get Visible(): boolean { return this._visible; }
  public set Visible(x: boolean) { this._visible = x; }
  public get Parent(): Sprite25D { return this._parent; }
  public get Children(): Array<Sprite25D> { return this._children; }
  public get WorldView(): WorldView25D { return this._worldView; }
  public set WorldView(x: WorldView25D) { this._worldView = x; }

  public get Dirty(): boolean { return this._dirty; }

  public get Destroyed(): boolean { return this._destroyed; }
  public set Destroyed(x: boolean) { this._destroyed = x; }

  public get Position(): vec3 { return this._location; }
  public set Position(x: vec3) { this._location = x; }
  public get Rotation(): Quaternion { return this._rotation; }
  public set Rotation(x: Quaternion) { this._rotation = x; }
  public get Scale(): vec2 { return this._scale; }
  public set Scale(x: vec2) { this._scale = x; }

  public get Size(): vec2 { return this._size; }
  public set Size(x: vec2) { this._size = x; }
  public get Width(): number { return this._size.x; }
  public set Width(x: number) { this._size.x = x; }
  public get Height(): number { return this._size.y; }
  public set Height(x: number) { this._size.y = x; }


  public constructor(name: string = null) {
    if (name) {
      this._name = name;
    }

    this._uniqueId = Sprite25D._idGen++;
    this._animation = new Animation25D(this);
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


    this._animation = other._animation.clone(this);

    this._color = other._color;
    this._subTile = other._subTile.clone();
    this._flipH = other._flipH;
    this._flipV = other._flipV;
  }
  public clone(): Sprite25D {
    let ret = new Sprite25D();
    ret.copy(this);
    return ret;
  }
  public update(dt: number) {
    this.Animation.update(dt);

    for (let ci = 0; ci < this._children.length; ++ci) {
      this._children[ci].update(dt);
    }
  }
  public add(ob: Sprite25D) {
    if (this.findById(ob.UniqueId) !== null) {
      Globals.logError("Tried to add duplicate sprite to hierarchy.");
    }
    else {
      this._children.push(ob);
      ob._parent = this;
    }
  }
  public findById(id: number) {
    let ret: { x: Sprite25D; } = { x: null };
    this.findById_r(id, ret);
    return ret.x;
  }
  private findById_r(id: number, ret: { x: Sprite25D }) {
    if (this.UniqueId === id) {
      ret.x = this;
      return;
    }
    else {
      for (let c of this.Children) {
        c.findById_r(id, ret);
        if (ret.x) {
          break;
        }
      }
    }
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
  public getSubTile(i: number, j: number): Sprite25D {
    //Returns the SubTile at the given i,j offset
    let ret: { x: Sprite25D; } = { x: null };
    this.getSubTile_r(i, j, ret);
    return ret.x;
  }
  private getSubTile_r(i: number, j: number, ret: { x: Sprite25D }) {
    if (this.SubTile && this.SubTile.x === i && this.SubTile.y === j) {
      ret.x = this;
    }
    else {
      for (let c of this.Children) {
        c.getSubTile_r(i, j, ret);
        if (ret.x) { }
        break;
      }
    }
  }

  public markDirty(flags: number = DirtyFlag.All) {
    this._dirty = true;
    this._dirtyFlags |= flags;
  }
  public clearDirty() {
    this._dirty = false;
    this._dirtyFlags = 0;
  }

}
export class TileBuffer extends THREE.BufferGeometry {
  private _bufferSizeTiles: number = 0;

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
  public beginCopy() {
    this._updFlags = 0;
    this._usedBufferLengthTiles = 0; //reset
  }
  public endCopy() {
    let p: boolean = true; //From now on always update tile transform (since tiles will almost always be needing update)
    let n: boolean = (this._updFlags & DirtyFlag.Normals) > 0;
    let c: boolean = (this._updFlags & DirtyFlag.Colors) > 0;
    let t: boolean = (this._updFlags & DirtyFlag.UVs) > 0;

    this._attrPosition.needsUpdate = p;
    this._attrNormal.needsUpdate = n;
    this._attrColor.needsUpdate = c;
    this._attrTexture.needsUpdate = t;

    this.updateBufferRange();
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
  private _debugNumCopies = 0;
  public copyTile(tile: Sprite25D) {
    if (tile.Animation.Frame2 && tile.Animation.FrameBlend > 0.0001) {
      this.copyFrame(tile, tile.Animation.Frame, tile.Animation.FrameBlend);
      this.copyFrame(tile, tile.Animation.Frame2, 1 - tile.Animation.FrameBlend);
    }
    else {
      this.copyFrame(tile, tile.Animation.Frame);
    }
  }
  public copyFrame(tile: Sprite25D, frame: SpriteFrame, blend: number = 1) {
    let v: Array<vec3> = new Array<vec3>(4);
    let t: Array<vec2> = new Array<vec2>(4);
    let off = this._usedBufferLengthTiles * 4;
    let flags = tile.DirtyFlags;
    if (blend) {
      flags |= DirtyFlag.Colors;
    }

    this._updFlags |= tile.DirtyFlags;
    /*
    0 --- 1
    2 --- 3
    */
    //Translate tile with origin.
    let tilepos_translated: vec3 = tile.Position.clone().add(tile.Animation.AnimatedPosition).add(tile.Origin);

    //Position the image relative to the world grid's basis
    let tilepos_local: vec3 = this._view.Right.clone().multiplyScalar(tilepos_translated.x);
    tilepos_local.add(this._view.Down.clone().multiplyScalar(tilepos_translated.y));
    tilepos_local.add(this._view.Normal.clone().multiplyScalar(tilepos_translated.z));

    v[0] = this._view.position.clone().add(tilepos_local);
    v[1] = v[0].clone().add(this._view.Right.clone().multiplyScalar(tile.Width * tile.Scale.x * tile.Animation.AnimatedScale.x));
    v[2] = v[0].clone().add(this._view.Down.clone().multiplyScalar(tile.Height * tile.Scale.y * tile.Animation.AnimatedScale.y));
    v[3] = v[2].clone().add(this._view.Right.clone().multiplyScalar(tile.Width * tile.Scale.x * tile.Animation.AnimatedScale.x));

    let verts: Float32Array = (this._attrPosition.array as Float32Array);
    let norms: Float32Array = (this._attrNormal.array as Float32Array);
    let colors: Float32Array = (this._attrColor.array as Float32Array);
    let uvs: Float32Array = (this._attrTexture.array as Float32Array);

    for (let vi = 0; vi < 4; ++vi) {
      let vv = off + vi;

      verts[vv * this._vsiz + 0] = v[vi].x;
      verts[vv * this._vsiz + 1] = v[vi].y;
      verts[vv * this._vsiz + 2] = v[vi].z;

      if (flags & DirtyFlag.Normals) {
        norms[vv * this._nsiz + 0] = this._view.Normal.x;
        norms[vv * this._nsiz + 1] = this._view.Normal.y;
        norms[vv * this._nsiz + 2] = this._view.Normal.z;
      }
      if (flags & DirtyFlag.Colors) {
        colors[vv * this._csiz + 0] = tile.Color.x;
        colors[vv * this._csiz + 1] = tile.Color.y;
        colors[vv * this._csiz + 2] = tile.Color.z;
        colors[vv * this._csiz + 3] = tile.Color.w * blend;
      }
    }

    if (flags & DirtyFlag.UVs) {
      if (frame) {
        this.copyFrameUVs(uvs, frame, tile.FlipH, tile.FlipV, off);
      }
    }

    this._debugNumCopies++;
    this._usedBufferLengthTiles++;
  }
  private copyFrameUVs(uvs: Float32Array, frame: SpriteFrame, fliph: boolean, flipv: boolean, off: number) {
    let f = frame;
    let x0 = f.x;
    let y0 = f.y;
    let x1 = f.x + f.w;
    let y1 = f.y + f.h;

    if (fliph) {
      let t = x0;
      x0 = x1;
      x1 = t;
    }
    if (flipv) {
      let t = y0;
      y0 = y1;
      y1 = t;
    }

    uvs[off * 2 + 0] = x0;
    uvs[off * 2 + 1] = y1;
    uvs[off * 2 + 2] = x1;
    uvs[off * 2 + 3] = y1;
    uvs[off * 2 + 4] = x0;
    uvs[off * 2 + 5] = y0;
    uvs[off * 2 + 6] = x1;
    uvs[off * 2 + 7] = y0;
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
      this.setDrawRange(0, this._usedBufferLengthTiles * 6);
    }
    else {
      this.setDrawRange(0, 6);
    }
  }
}
export class Viewport25D {
}
export class WorldView25D extends Object3D {
  // This class is a viewport into the 2D game world.  
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
  private _destroyed: Map<Sprite25D, Sprite25D> = new Map<Sprite25D, Sprite25D>();

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
      , transparent: true //Adds this to the transparency step of the rasterizer.
      , wireframe: false
      , alphaTest: 0.01 // Quickly cut out shitty transparency
      , blending: THREE.MultiplyBlending // or Normalblending (unsure)
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
  public update(dt: number) {
    //Update the plane information
    this.updatePlane();

    //Update Objects
    for (const [key, value] of this._objects) {
      //There may be a faster way to do this. For instance, static objects don't update.
      key.update(dt);
    }

    //   gatherVisibleObjects();

    //   sortVisibleObjects();

    //   //Sort by Z
    //   this._objects = this._objects.sort((obj1, obj2) => {
    //     if (obj1.Position.z > obj2.Position.z) {
    //         return 1;
    //     }
    //     if (obj1.Position.z < obj2.Position.z) {
    //       return -1;
    //   }
    //     return 0;
    // });

    //Copy Render Data
    this._buffer.beginCopy();
    for (const [key, value] of this._objects) {
      if (key.Visible) {
        //There may be a faster way to do this. For instance, static objects don't update.
        this.copyTile(key);
      }
    }
    this._buffer.endCopy();

    //Box
    if (Globals.isDebug()) {
      if (this._boxHelper !== null) {
        this.remove(this._boxHelper);
      }
      this._boxHelper = new THREE.BoxHelper(this._mesh, new THREE.Color(0xffff00));
      this.add(this._boxHelper);
    }
  }

  private copyTile(ob: Sprite25D) {
    this._buffer.copyTile(ob);
    ob.clearDirty();

    for (let ci = 0; ci < ob.Children.length; ci++) {
      this.copyTile(ob.Children[ci]);
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
export class WorldManager25D extends Object3D {
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
let g_hand: THREE.Object3D = null;

$(document).ready(function () {
  Globals.setFlags(document.location);

  Globals.init();
  Globals.prof.frameStart();

  loadResources();
});
let g_atlas: Atlas = null;
function loadResources() {

  //https://threejs.org/docs/#manual/en/introduction/Animation-system

  // this should really be handled by a promise.
  g_atlas = new Atlas(
    1 as Int, 1 as Int, 1 as Int, 1 as Int,
    1 as Int, 1 as Int,
    16 as Int, 16 as Int, './dat/img/tiles.png', function () {
      Globals.models.loadModel(Files.Model.Hand, ['Armature', 'Action_Point'], function (success: boolean, arr: Array<Object3D>, gltf: any): THREE.Object3D {
        if (success) {
          if (arr.length === 2) {
            return arr[0];
          }
        }
        return null;
      })
    });
  Globals.models.setModelAsyncCallback(Files.Model.Hand, function (model: THREE.Mesh) {
    g_hand = model;
    //Apply Hand Transforms.
    //Note: We might be able to swap left/right here.
    g_hand.rotateY(Math.PI);
    //g_hand.scale.set(-1,0,0);
    Globals.scene.add(g_hand);

    initializeGame();
  });
}
function initializeGame() {
  createWorld();
  createBackground();
  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(1);
    Globals.scene.add(axis);
  }
  Globals.prof.frameEnd();
  $('#outPopUp').hide();
  Globals.startGameEngine(gameLoop);
}

let g_playerchar: Sprite25D = null;
function createWorld() {
  //Load Resources

  g_world = new WorldManager25D();

  //Addijng 2 just cuz
  let world = new WorldView25D(10, 7, 1, 1, g_atlas);
  world.position.z = -2;
  g_world.addView(world);
  Globals.scene.add(g_world);

  function mfr(x: number, y: number): FDef {
    //make frame
    return new FDef(new vec2(x, y), false, false, new vec4(1, 1, 1, 1), SpriteKeyFrameInterpolation.Step);
  }

  //g_testTile = new Sprite25D();
  //world.addObject25(g_testTile);

  g_playerchar = new Sprite25D();
  g_playerchar.Animation.addTiledAnimation("walk_down",
    [mfr(0, 1), mfr(1, 1), mfr(0, 1), mfr(2, 1)],
    0.7, g_atlas,
    new vec2(1, 2));
  g_playerchar.Animation.addTiledAnimation("walk_right",
    [mfr(3, 1), mfr(4, 1), mfr(3, 1), mfr(5, 1)],
    0.7, g_atlas,
    new vec2(1, 2));
  g_playerchar.Animation.addTiledAnimation("walk_left",
    [mfr(0, 3), mfr(1, 3), mfr(0, 3), mfr(2, 3)],
    0.7, g_atlas,
    new vec2(1, 2));
  g_playerchar.Animation.addTiledAnimation("walk_up",
    [mfr(6, 1), mfr(7, 1), mfr(6, 1), mfr(8, 1)],
    0.7, g_atlas,
    new vec2(1, 2));
  world.addObject25(g_playerchar);

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
  if (Globals.input.mouse.Left.pressed()) {
    Globals.input.left.Axis.set(0, 0);
    Globals.input.keyboard.SmoothAxis = true;
  }
  else if (Globals.input.mouse.Left.released()) {
    Globals.input.keyboard.SmoothAxis = false;
    Globals.input.left.Axis.set(0, 0);
  }
  if (Globals.input.mouse.Left.pressOrHold()) {
    movePlayer(dt);
  } else {
    movePlayerChar();
  }

  if (g_playerchar.Animation.CurrentAnimation === null) {
    g_playerchar.Animation.play("walk_down", true);
  }

  //Update hand
  if (g_hand) {
    if (Globals.userIsInVR()) {
      g_hand.position.copy(Globals.input.right.Position);
    }
    else {
      let handpos = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, 4);


      g_hand.position.copy(handpos);
      //g_hand.updateMatrix();
    }
  }

  g_world.update(dt);
  Globals.prof.end("main game loop");
}
function movePlayer(dt: number) {
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
}
function movePlayerChar() {
  if (Globals.input.left.MoveLeft) {
    g_playerchar.Animation.play("walk_left", true);
  }
  else if (Globals.input.left.MoveRight) {
    g_playerchar.Animation.play("walk_right", true);
  }
  else if (Globals.input.left.MoveUp) {
    g_playerchar.Animation.play("walk_up", true);
  }
  else if (Globals.input.left.MoveDown) {
    g_playerchar.Animation.play("walk_down", true);
  }
  else {

    g_playerchar.Animation.pause();

    g_playerchar.Animation.setKeyFrame(0, null, true);
  }
}
function createBackground() {
  g_ambientlight = new THREE.AmbientLight(0x404040);
  Globals.scene.add(g_ambientlight);

  g_pointlight = new THREE.PointLight(0xffff99, 1, 2000);
  Globals.scene.add(g_pointlight);
}

