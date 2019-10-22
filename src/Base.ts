
import * as THREE from 'three';
import {
  Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3,
  Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial,
  RGBA_ASTC_10x5_Format, Material
} from 'three';
import * as GLTFLoader_ from 'three/examples/jsm/loaders/GLTFLoader';
import MersenneTwister from "mersenne-twister";
import { VRInputManager, VRGamepad, VRButton } from './Gamepad';
import { PhysicsObject3D, PhysicsManager3D } from './Physics3D';
import { Globals } from './Globals';
import { Utils } from './Utils';
import * as Files from './Files';
import { vec4, vec3, vec2 } from './Math';

export interface AfterLoadFunction { (x: any): void; };


//https://stackoverflow.com/questions/38213926/interface-for-associative-object-array-in-typescript
export interface Dictionary<T> {
  [key: string]: T;
}

export class Random {
  private static _rand: MersenneTwister = new MersenneTwister;
  private static _initialized: boolean = false;

  private static randomInt(): number {
    if (this._initialized == false) {
      this._initialized = true;
      this._rand.init_seed(new Date().getTime());
    }
    return this._rand.random();
  }
  public static float(min: number, max: number) {
    let f01: number = this.randomInt();
    let n2 = min + (max - min) * f01;
    return n2;
  }
  public static randomColor(): Color {
    let c: Color = new Color();
    let v: Vector3 = this.randomNormal().multiplyScalar(2).subScalar(1);
    c.r = v.x;
    c.g = v.y;
    c.b = v.z;
    return c;
  }
  public static randomVec4(min: number, max: number): vec4 {
    let v: vec4 = new vec4();
    v.x = Random.float(min, max);
    v.y = Random.float(min, max);
    v.z = Random.float(min, max);
    v.w = Random.float(min, max);
    return v;
  }
  public static randomVec3(min: number, max: number): vec3 {
    let v: vec3 = new vec3();
    v.x = Random.float(min, max);
    v.y = Random.float(min, max);
    v.z = Random.float(min, max);
    return v;
  }
  public static randomNormal(): Vector3 {
    let v = this.randomVec3(-1, 1).normalize();
    return v;
  }
  public static bool() {
    //return this._random.random_incl() > 0.5;
    return Math.random() > 0.5;
  }
}

export class AsyncMusic {
  public audio: THREE.Audio = null;
  public stopped: boolean = false;
  public constructor(a: THREE.Audio) {
    this.audio = a;
  }
  public stop() {
    if (this.audio && this.audio.source) {
      this.audio.stop();
    }
  }
  public play() {
    if (this.audio && this.audio.source) {
      this.audio.play();
    }
  }
}
/**
 * Manages Audio using the THREE WebAudio interface
 */
interface AfterLoadMusicCallback { (audio: THREE.Audio): void; }
export class AudioManager {
  public _listener: THREE.AudioListener = new THREE.AudioListener();
  public _audioLoader: THREE.AudioLoader = new THREE.AudioLoader();
  private _bufferCache: Dictionary<THREE.AudioBuffer> = {};
  private _cache: Dictionary<Array<THREE.PositionalAudio>> = {};

  private _maxDist: number = 200;

  private _music: Dictionary<AsyncMusic> = {};

  public constructor() {
    this._listener = new THREE.AudioListener();
    this._audioLoader = new THREE.AudioLoader();

    //Do not add AudioListener as a sub-object, manually just update its position.
    //The reason is that a lot of THREE's methods call a force matrix update that also calls AudioLisnener's matrix update
    //There seems to be a memory leak somewhere in there.
    Globals.scene.add(this._listener);

  }

  /**
   *  Playing Lots of Sounds
   *  There are multiple ways to do this.  The slowest - you can reload the sound.  Second fastest is to share the loaded AudioBuffer, 
   *  however there is still a slight performance hit, but you get every sound.
   *  The last is to use one sound, and save it and share it.  There are some audio anomolies because you can't use the same buffer for many sounds, however this is by far the fastest method.
   *  To make it faster, we use both methods, grow the sound buffer as needed, and use sounds already loaded.
   * @param file
   * @param loop 
   * @param cache 
   */
  public play(file: Files.Audio, pos: Vector3, loop: boolean = false, cache: boolean = true) {
    //let that = this;
    let szfile: string = './dat/audio/' + file;

    //Three, or WebAudio must be doing some background caching, so the cache here is actually not needed, and hinders audio performance.
    if (cache === false) {
      this.loadAndPlaySound(szfile, loop, pos);
    }
    else {
      if (szfile in this._cache) {
        //If the loaded sound is already playing, create a new one.
        //This is actualy somewhat slow, but we will at least catch all sounds.
        //This means our buffer will organically expand to fill the audio need.
        let played: boolean = false;
        for (let ibuffer = 0; ibuffer < this._cache[szfile].length; ++ibuffer) {
          if (this._cache[szfile][ibuffer].isPlaying === false) {
            this._cache[szfile][ibuffer].startTime = 0;
            this._cache[szfile][ibuffer].setLoop(loop);
            this._cache[szfile][ibuffer].setRefDistance(this.calcSoundDist(pos));
            this._cache[szfile][ibuffer].setMaxDistance(this._maxDist);
            this._cache[szfile][ibuffer].position.copy(pos);
            this._cache[szfile][ibuffer].play();
            played = true;
            break;
          }
        }
        //however we don't want to grow uncontrolled, so cap at 16 sounds.
        if (!played && this._cache[szfile].length < 16) {
          let aud: THREE.PositionalAudio = new THREE.PositionalAudio(this._listener);
          aud.setBuffer(this._bufferCache[szfile]);
          aud.setLoop(loop);
          aud.setVolume(1);
          aud.position.copy(pos);
          aud.startTime = 0;
          aud.play();
          aud.setRefDistance(this.calcSoundDist(pos));
          aud.setMaxDistance(this._maxDist);
          Globals.scene.add(aud);
          this._cache[szfile].push(aud);
        }
      }
      else {
        this.loadAndPlaySound(szfile, loop, pos);
      }
    }
  }
  private calcSoundDist(pos: Vector3): number {
    if (pos != null) {
      let dist: number = pos.clone().sub(Globals.player.WorldPosition).length();

      dist = Utils.clampScalar(this._maxDist - dist, 0, this._maxDist);

      let n = 0;
      n++;
      Globals.logInfo("Sound distance: " + dist)
      return dist;
    }
    else {
      return 1;
    }
  }
  private loadAndPlaySound(file: string, loop: boolean, pos: Vector3): void {
    let that = this;
    this._audioLoader.load(file, function (buffer: THREE.AudioBuffer) {
      that._bufferCache[file] = buffer;
      that._cache[file] = new Array<THREE.PositionalAudio>();
      let a: THREE.PositionalAudio = new THREE.PositionalAudio(that._listener);

      a.setBuffer(buffer);
      a.setRefDistance(that.calcSoundDist(pos));
      a.setMaxDistance(that._maxDist);
      a.position.copy(pos);
      a.setLoop(loop);
      a.setVolume(1);
      a.startTime = 0;
      a.play();

      Globals.scene.add(a);

      that._cache[file].push(a);

    }, function (xhr: any) {
      //Do not log this was causing lag
      // Globals.logDebug(" " + file + " loading " + xhr)
    }, function (err: any) {
      Globals.logError('Error loading  sound ' + file + " : " + err);
    });
  }
  public playMusic(file: Files.Audio) {
    let audio_root: string = './dat/audio/';
    let music_file = audio_root + file;

    if (file in this._music && this._music[file] && this._music[file].audio && this._music[file].audio.source) {
      this._music[file].stop();
      this._music[file].play();
    }
    else {
      let that = this;
      //Lost sound handle, reload.
      Globals.audio._audioLoader.load(music_file, function (buffer: THREE.AudioBuffer) {
        let ret: THREE.Audio = null;
        ret = new THREE.Audio(Globals.audio._listener);
        ret.setBuffer(buffer);
        ret.setLoop(true);
        ret.setVolume(.55);
        ret.play();
        that._music[file] = new AsyncMusic(ret);
      }, function (xhr: any) {
        //Do not log this was causing lag
        //  Globals.logDebug(" " + music_file + " loading " + xhr)
      }, function (err: any) {
        Globals.logError('Error loading  sound ' + music_file + " : " + err);
      });
    }
  }
  public stopMusic(file: Files.Audio) {
    if (file in this._music) {
      let audio: AsyncMusic = this._music[file];
      if (audio && audio.audio && audio.audio.source) {
        audio.stop();
      }
      else {
        this._music[file] = null;
      }
    }

  }
  private _lastMasterVolume: number = 0;
  public disableAudio() {
    this._lastMasterVolume = this._listener.getMasterVolume();
    this._listener.setMasterVolume(0);
  }
  public enableAudio() {
    this._listener.setMasterVolume(this._lastMasterVolume);
  }
}


export interface ModelCallback { (model: THREE.Mesh): void; };
export interface ModelObjectCallback { (object: PhysicsObject3D, model: THREE.Mesh): void; };
export interface AfterLoadModel { (success: boolean, arr: Array<Object3D>, gltf: any): Object3D; };
export class ModelManager {

  private _cache: Dictionary<THREE.Object3D> = {};
  private _modelBaseDir: string = './dat/model/';

  private _callbacks: Dictionary<Array<ModelCallback>> = {}

  constructor() {
  }
  public setModelAsyncCallback(model: Files.Model, callback: ModelCallback): void {
    let szfile = this._modelBaseDir + model;

    if (szfile in this._cache) {
      let m: THREE.Mesh = this._cache[szfile] as THREE.Mesh;
      callback(m);
    }
    else {
      if (!this._callbacks[szfile]) {
        this._callbacks[szfile] = new Array<any>();
      }
      this._callbacks[szfile].push(callback);
    }
  }
  public loadModel(filename: Files.Model, obj_names_in_scene: Array<string>, afterLoad: AfterLoadModel) {
    Globals.logDebug('loading model "' + filename + '".')
    let that = this;
    let loader = new GLTFLoader_.GLTFLoader();
    let szfile = this._modelBaseDir + filename;
    loader.load(
      szfile,
      function (gltf: any) {
        let success: boolean = true;

        //Grab a list of named objects the user requested. (why? we could just traverse the graph)
        let arrobjs: Array<Object3D> = new Array<Object3D>();
        for (let i = 0; i < obj_names_in_scene.length; i++) {
          let sz = obj_names_in_scene[i];

          let obj = gltf.scene.getObjectByName(sz);
          if (!obj) {
            Globals.logError("Could not find model " + sz + " while loading " + filename);
            success = false;
          }
          else {
            arrobjs.push(obj);
          }
        }

        //Call the after load lambda
        let obj = afterLoad(success, arrobjs, gltf);
        if (obj == null) {
          Globals.logError("loaded model was null, model must be returned from closure");
        }
        else {
          that._cache[szfile] = obj;
        }

        //Invoke callbacks to set models async
        try {
          if (that._callbacks[szfile] != null) {
            let mesh = obj as THREE.Mesh; // Must cast to mesh
            //We must loop in this order to call first callbacks first.
            for (let ci = 0; ci < that._callbacks[szfile].length; ci++)//that._callbacks[szfile].length - 1; ci >= 0; ci--) 
            {
              if (that._callbacks[szfile][ci]) {
                that._callbacks[szfile][ci](mesh);
              }
              else {
                Globals.logError("Model Callback was undefined for " + szfile);
              }
            }
            that._callbacks[szfile] = null;
          }
        }
        catch (e) {
          Globals.logError("exception thrown executing model load callbacks: " + e + "\r\n" + "stack: " + e.stack);
        }
        Globals.logDebug('...loaded model "' + filename + '" -- success.');
      },
      function (xhr: any) {
        Globals.logInfo('model ' + (xhr.loaded / xhr.total * 100).toFixed(2) + '% loaded.');
      },
      function (error: any) {
        Globals.logInfo('Error loading "' + szfile + '" : ' + error);
      }
    );
  }
}
export class IAFloat {
  public Min: number = 0;
  public Max: number = 1;
  public constructor(min: number, max: number) {
    this.Min = min;
    this.Max = max;
  }
  public calc(): number {
    return Random.float(this.Min, this.Max);
  }
}
export class IAVec3 {
  public Min: Vector3 = new Vector3(0, 0, 0);
  public Max: Vector3 = new Vector3(1, 1, 1);
  public constructor(min: Vector3, max: Vector3) {
    this.Min = min;
    this.Max = max;
  }
  public calc(): Vector3 {
    let r: Vector3 = new Vector3();
    r.x = Random.float(this.Min.x, this.Max.x);
    r.y = Random.float(this.Min.y, this.Max.y);
    r.z = Random.float(this.Min.z, this.Max.z);
    return r;
  }
}
// class ParticleParams {
//   public Count: IAFloat = new IAFloat(10, 20);
//   public Speed: IAFloat = new IAFloat(70, 70); //m/s
//   public Position: Vector3 = new Vector3();
//   public Scale_Delta: Vector3 = new Vector3(0, 0, 0);
//   public InitialScale: IAVec3 = new IAVec3(new Vector3(1, 1, 1), new Vector3(1, 1, 1));
//   public UniformScale: boolean = false;
//   public Rotation_Delta: Vector3 = new Vector3(0, 0, 0);
//   public Color: IAVec3 = new IAVec3(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
//   public Opacity: IAFloat = new IAFloat(0, 0);
// }
// class Particle extends PhysicsObject {
//   public constructor(m: THREE.Mesh) {//file:Files.Model) {
//     super(true);

//     //A direct clone for particles is ok, no need for crazy material with duplicatemodel
//     let b2 = m.clone();
//     b2.traverse(function (o: Object3D) {
//       if (o instanceof THREE.Mesh) {
//         let m: THREE.Mesh = o as THREE.Mesh;

//         if (m.material instanceof THREE.MeshBasicMaterial) {
//           m.material = m.material.clone();
//         }
//         if (m.material instanceof THREE.MeshStandardMaterial) {
//           m.material = m.material.clone();
//         }
//       }
//     });
//     this.setModel(b2);

//   }
// }
// class Particles {
//   // private _particles: Array<Particle> = new Array<Particle>();
//   private _mesh: THREE.Mesh = null;

//   public constructor() {
//     var geo = new THREE.BoxBufferGeometry(1, 1, 1);
//     geo.computeBoundingBox(); // for hit area
//     var mat = new THREE.MeshBasicMaterial({
//       //map: this._texture,
//       transparent: false,
//       side: THREE.FrontSide,
//       color: 0xFFFFFF,
//     });
//     geo.computeBoundingBox();

//     this._mesh = new THREE.Mesh(geo, mat);
//   }
//   public create(params: ParticleParams) {
//     let ct: number = params.Count.calc();
//     for (let i = 0; i < ct; ++i) {
//       let p = new Particle(this._mesh);
//       p.Velocity = Random.randomNormal().multiplyScalar(params.Speed.calc());
//       p.RotationDelta.copy(params.Rotation_Delta);
//       p.ScaleDelta.copy(params.Scale_Delta);
//       p.position.copy(params.Position);
//       p.color = Utils.vec3ToColor(params.Color.calc());
//       let sv: Vector3 = params.InitialScale.calc();
//       if (params.UniformScale) {
//         sv.x = sv.y = sv.z;
//       }
//       p.scale.copy(sv);
//       p.OpacityDelta = params.Opacity.calc();
//     }
//   }
//   public createBossDieParticles(pos: Vector3) {
//     let params: ParticleParams = new ParticleParams();
//     params.Count = new IAFloat(150, 200);
//     params.Position.copy(pos);
//     params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.InitialScale.Min.set(0.5, 0.5, 0.5);
//     params.InitialScale.Max.set(4, 4, 4);
//     params.Scale_Delta.x =
//       params.Scale_Delta.y =
//       params.Scale_Delta.z = Random.float(-0.3, -0.2);
//     params.Speed.Max = 100;
//     params.Speed.Min = 0.2;//Random.float(10, 100);
//     params.Color.Min.set(0.1, 0.1, 0.2);
//     params.Color.Max.set(0.3, 1, 1.0);
//     params.Opacity.Max = params.Opacity.Min = -0.4;//(-0.1,-0.1);
//     this.create(params);
//   }
//   public createShipDieParticles(pos: Vector3) {
//     let params: ParticleParams = new ParticleParams();
//     params.Count = new IAFloat(20, 30);
//     params.Position.copy(pos);
//     params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = Random.float(-2, -0.6);
//     params.Speed.Max = params.Speed.Min = Random.float(60, 100);
//     params.Color.Min.set(0.7, 0.7, 0);
//     params.Color.Max.set(1, 1, .3);
//     this.create(params);
//   }
//   public createItemParticles(pos: Vector3) {
//     let params: ParticleParams = new ParticleParams();
//     params.Count = new IAFloat(5, 10);
//     params.Position.copy(pos);
//     params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = Random.float(-2, -0.3);
//     params.Speed.Max = params.Speed.Min = Random.float(10, 40);
//     params.Color.Min.set(0.3, 0.3, 0.7);
//     params.Color.Max.set(0.3, 0.3, 1);
//     this.create(params);
//   }
//   public createShipHitParticles(pos: Vector3) {
//     let params: ParticleParams = new ParticleParams();
//     params.Count = new IAFloat(3, 8);
//     params.Position.copy(pos);
//     params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = Random.float(-4, -0.9);
//     params.Speed.Max = params.Speed.Min = Random.float(40, 100);
//     params.Color.Min.set(0.6, .7, .4);
//     params.Color.Max.set(0.6, 1, 1);
//     params.InitialScale.Min.set(0.3, 0.3, 0.3);
//     params.InitialScale.Min.set(0.6, 0.6, 0.6);
//     this.create(params);
//   }
//   public createBlasterParticlels(pos: Vector3, color: Color) {
//     let params: ParticleParams = new ParticleParams();
//     params.Count = new IAFloat(2, 4);
//     params.Position.copy(pos);
//     params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = 0;// new Vector3(1,1,1);//Random.float(-2, -0.3);
//     params.Speed.Max = params.Speed.Min = Random.float(4, 6);
//     params.Color.Min.set(color.r, color.g, color.b);
//     params.Color.Max.set(color.r, color.g, color.b);
//     params.InitialScale.Min.set(0.01, 0.01, 0.01);
//     params.InitialScale.Max.set(0.02, 0.02, 0.02);
//     params.UniformScale = true;
//     params.Opacity.Max = params.Opacity.Min = -0.1;//(-0.1,-0.1);
//     this.create(params);
//   }
// }
// //A small rotating model for the title screen.
// class TitleModel extends PhysicsObject {
//   private _target: Vector3 = new Vector3(0, 0, 0);

//   public constructor() {
//     super();
//     let that = this;
//     g_models.setModelAsyncCallback(Files.Model.Player_Ship, function (m: THREE.Mesh) {
//       let m2: THREE.Mesh = m.clone();
//       m2.scale.set(3, 3, 3);
//       that.setModel(m2);
//     });
//     this.RotationDelta.y = Math.PI * 0.113;
//   }
//   public update(dt: number) {
//     let cam_dir: Vector3 = new Vector3();
//     Globals.camera.getWorldDirection(cam_dir);
//     let right: Vector3 = Globals.camera.up.clone().cross(cam_dir);
//     let up = cam_dir.clone().cross(right).normalize();

//     //target pos
//     let lookat: Vector3 = Globals.player.position.clone().add(cam_dir.multiplyScalar(10).sub(up).multiplyScalar(2));
//     let target: Vector3 = lookat.clone().sub(this.position);

//     //let smooth:Vector3 = Utils.cosineInterpolate()

//     this.position.add(target.multiplyScalar(0.25));

//     super.update(dt);
//   }
// }


export class WaitTimer {
  private _time: number = 2;
  private _interval: number = 2;
  get interval(): number { return this._interval; }
  set interval(n: number) { this._interval = n; }
  get time(): number { return this._time; }
  get time01(): number { return 1 - this._time / this._interval; }

  public constructor(interval: number) {
    this._interval = this._time = interval;
  }
  public update(dt: number): boolean {
    if (this._time > 0) {
      this._time -= dt;
      if (this._time <= 0) {
        this._time = 0;
      }
    }
    return this.ready();
  }
  public trigger() {
    this._time = 0;
  }
  public ready(): boolean {
    return this._time <= 0;
  }
  public reset() {
    this._time = this._interval;
  }
}
interface TimerTickFunction { (): void; };
export enum TimerState { Stopped, Running }
export class Timer {
  public Func: TimerTickFunction = null;
  public Interval: number = 10; //milliseconds
  private _t: number = 0; //milliseocnds
  private _state: TimerState = TimerState.Stopped;
  public constructor(interval: number, func: TimerTickFunction) {
    this.Func = func;
    this.Interval = interval;
    this.start();
  }
  public start() {
    this._state = TimerState.Running;
    this._t = this.Interval;
  }
  public pause() {
    this._state = TimerState.Stopped;
  }
  public stop() {
    this._state = TimerState.Stopped;
  }
  public update(dt: number) {
    if (this._state === TimerState.Running) {
      let idt: number = dt * 1000; // to millis

      //Incorrect, shoudl be looped. but we'll fix this later.
      this._t -= idt;
      if (this._t <= 0) {
        if (this.Func) {
          this.Func();
        }
        this._t = this.Interval;
      }
    }
  }
}
export class PointGeo extends THREE.Object3D {
  public constructor() {
    super();
    let p0: Vector3 = new Vector3(0, 0, 0);
    let points_geo: THREE.Geometry = new THREE.Geometry();
    points_geo.vertices.push(p0);
    var pointMaterial = new THREE.PointsMaterial({ color: 0xFFFF00, size: 0.1 });
    let points: THREE.Points = new THREE.Points(points_geo, pointMaterial);
    this.add(points);
  }
}
enum ButtonState { Press, Hold, Release, Up }
export class VirtualButton {
  private _state: ButtonState = ButtonState.Up;
  get state(): ButtonState { return this._state; }
  public pressed(): boolean { return this.state === ButtonState.Press; }
  public released(): boolean { return this.state === ButtonState.Release; }
  public down(): boolean { return this.state === ButtonState.Hold; }
  public pressOrHold(): boolean { return this.state === ButtonState.Hold || this.state == ButtonState.Press; }
  public update(pressed: boolean) {
    if (pressed) {
      if (this._state === ButtonState.Press) {
        this._state = ButtonState.Hold;
      }
      else if (this._state === ButtonState.Hold) {
      }
      else if (this._state === ButtonState.Release) {
        this._state = ButtonState.Press;
      }
      else if (this._state === ButtonState.Up) {
        this._state = ButtonState.Press;
      }
    }
    else {
      if (this._state === ButtonState.Press) {
        this._state = ButtonState.Release;
      }
      else if (this._state === ButtonState.Hold) {
        this._state = ButtonState.Release;
      }
      else if (this._state === ButtonState.Release) {
        this._state = ButtonState.Up;
      }
      else if (this._state === ButtonState.Up) {
      }
    }
  }
}

export class Screen2D {
  private _canvas: HTMLCanvasElement = null;
  get canvas(): HTMLCanvasElement { return this._canvas; }
  get pixelWidth(): number {
    return this._canvas.width;
  }
  get pixelHeight(): number {
    return this._canvas.height;
  }
  get elementWidth(): number {
    let rect = this._canvas.getBoundingClientRect();
    return rect.width;
  }
  get elementHeight(): number {
    let rect = this._canvas.getBoundingClientRect();
    return rect.height;
  }
  public constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
  }
  //void blit.

  //Return the relative XY of the mouse relative to the top left corner of the canvas.
  public getCanvasRelativeXY(clientX: number, clientY: number): Vector2 {
    let v2: Vector2 = new Vector2();
    //getMousePos
    //https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
    const canvas = Globals.renderer.domElement;
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;   // relationship bitmap vs. element for X
    let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
    v2.x = (clientX - rect.left) * scaleX;
    v2.y = (clientY - rect.top) * scaleY;
    return v2;
  }
  //Project canvas point into 3D space
  //Input is NON-RELATIVE mouse point ( passed in from mousemove event )
  public project3D(clientX: number, clientY: number, distance: number): Vector3 {
    let v2: Vector2 = this.getCanvasRelativeXY(clientX, clientY);
    let f: Frustum = new Frustum();
    let mouse_pos = f.project(v2.x, v2.y, distance);
    return mouse_pos;
  }
}
/**
 * Keyboard Input class
 */
enum KeyboardEventType { Up, Down }
export class Keyboard {
  private _w: VirtualButton = new VirtualButton();
  private _s: VirtualButton = new VirtualButton();
  private _a: VirtualButton = new VirtualButton();
  private _d: VirtualButton = new VirtualButton();
  private _buttons: Array<VirtualButton> = new Array<VirtualButton>();

  get w(): VirtualButton { return this._w; }
  get s(): VirtualButton { return this._s; }
  get a(): VirtualButton { return this._a; }
  get d(): VirtualButton { return this._d; }
  get buttons() { return this._buttons; }

  private _smoothAxis: boolean = false;  // Whether the X or Y axis smoothly transitions from -1, 0, 1.
  public get SmoothAxis(): boolean { return this._smoothAxis; }
  public set SmoothAxis(x: boolean) { this._smoothAxis = x; }

  private _smoothAxisSpeed: number = 10;  // Whether the X or Y axis smoothly transitions from -1, 0, 1.
  public get SmoothAxisSpeed(): number { return this._smoothAxisSpeed; }
  public set SmoothAxisSpeed(x: number) { this._smoothAxisSpeed = x; }

  public controlDown: boolean = false;
  private _events: Map<KeyboardEvent, KeyboardEventType> = new Map<KeyboardEvent, KeyboardEventType>();

  constructor() {
    this._buttons.push(this.w);
    this._buttons.push(this.s);
    this._buttons.push(this.a);
    this._buttons.push(this.d);
    let that = this;
    window.addEventListener("keydown", function (e: KeyboardEvent) {
      that._events.set(e, KeyboardEventType.Down);
    });
    window.addEventListener("keyup", function (e: KeyboardEvent) {
      that._events.set(e, KeyboardEventType.Up);
    });
  }
  public update() {
    //**This is obviously a problem, really we should store & pump these events each frame to reduce missed events.
    for (let [evt, k] of this._events) {
      if (k === KeyboardEventType.Down) {
        if (evt.ctrlKey) {
          this.controlDown = true;
        }
        if (evt.keyCode === 87) {//w
          this.w.update(true);
        }
        if (evt.keyCode === 83) { //s
          this.s.update(true);
        }
        if (evt.keyCode === 65) {//a
          this.a.update(true);
        }
        if (evt.keyCode === 68) {//d
          this.d.update(true);
        }
        //TESTS
        //if (Globals.isDebug()) 
        {
          if (this.controlDown) {
            //f1/2
            if (evt.keyCode === 112) { }
            if (evt.keyCode === 113) { }
            //f3
            if (evt.keyCode === 114) { }
            //f4
          }
        }
      }
      else if (k === KeyboardEventType.Up) {
        if (evt.ctrlKey) {
          this.controlDown = false;
        }
        if (evt.keyCode === 87) {//w
          this.w.update(false);
        }
        if (evt.keyCode === 83) { //s
          this.s.update(false);
        }
        if (evt.keyCode === 65) {  //a
          this.a.update(false);
        }
        if (evt.keyCode === 68) {    //d
          this.d.update(false);
        }
      }
    }
    this._events.clear();
  }

}
enum MouseEventType { MouseUp, MouseDown, MouseMove };
export class Mouse extends Vector3 {
  public moved: boolean = false;
  public mousePoint: PointGeo = null;
  private _rmbDown: boolean = false;
  private _lmbDown: boolean = false;
  private _left: VirtualButton = new VirtualButton();
  private _right: VirtualButton = new VirtualButton();
  private _wheel: number = 0;//Returns a number of mouse wheeel clicks.

  public get Wheel(): number { return this._wheel; }
  public get Left(): VirtualButton { return this._left; }
  public get Right(): VirtualButton { return this._right; }

  private _events: Map<MouseEvent, MouseEventType> = new Map<MouseEvent, MouseEventType>();

  private _mousewheel_evt: Array<MouseWheelEvent> = new Array<MouseWheelEvent>();

  private curView: vec3 = new vec3(0, 0, -1);

  public constructor() {
    super();
    this.registerDocumentCallbacks();
  }
  public postUpdate(){
    this._wheel = 0;
  }
  public update() {
    this.updateEventsSynchronously();
    this.Left.update(this._lmbDown);
    this.Right.update(this._rmbDown);
  }
  private registerDocumentCallbacks() {
    //Here we just set the mouse information either last, or this frame in order to update the mouse
    //at the same synchronous position in every browser.
    let that = this;
    document.addEventListener('mouseup', function (e: MouseEvent) {
      e.preventDefault();
      that._events.set(e, MouseEventType.MouseUp);
    });
    document.addEventListener('mousedown', function (e: MouseEvent) {
      e.preventDefault();
      that._events.set(e, MouseEventType.MouseDown);
    });
    document.addEventListener('contextmenu', function (e: MouseEvent) {
      e.preventDefault();
    });
    document.addEventListener('wheel', function (e: MouseWheelEvent) {
      e.preventDefault();
      that._mousewheel_evt.push(e);
    });
    //var controls = new OrbitControls.default();
    document.addEventListener('mousemove', function (e: MouseEvent) {
      e.preventDefault();
      that._events.set(e, MouseEventType.MouseMove);
    }, false);
  }
  private mouseMove(x: number, y: number) {
    if (!this.moved) {
      this.moved = true;
    }

    if (this.Left.down()) {
      this.flycamRotate(x, y);
    }

    this.x = x;
    this.y = y;
    this.z = 0;

    this.debugDrawMousePos();
  }
  private flycamRotate(newx: number, newy: number) {
    let dx = newx - this.x;
    let dy = newy - this.y;

    let maxPixel = 8;

    if (Math.abs(dx) > maxPixel) { dx = Math.sign(dx) * maxPixel }
    if (Math.abs(dy) > maxPixel) { dy = Math.sign(dy) * maxPixel }

    let campos = new vec3();
    Globals.camera.getWorldPosition(campos);
    let camdir = new vec3();
    Globals.camera.getWorldDirection(camdir);

    let rot_speed = 0.01; // Change this to change rotation speed.

    let right = camdir.clone().cross(Globals.camera.up).normalize();
    let down = Globals.camera.up.clone().normalize().multiplyScalar(-1);

    this.curView.add(right.multiplyScalar(dx * rot_speed));
    this.curView.add(down.multiplyScalar(dy * rot_speed));

    Globals.camera.lookAt(this.curView.clone().add(campos));
  }
  private shittyRotate() {
    // //Look at the point in the screen projected into 3D
    // let v2 = Globals.screen.getCanvasRelativeXY(e.clientX, e.clientY);

    // v2.x = (v2.x / Globals.screen.canvas.width) * 2 - 1;
    // v2.y = ((Globals.screen.canvas.height - v2.y) / Globals.screen.canvas.height) * 2 - 1;

    // let FOV = 1;//Increase to get more FOV 

    // let base = new Vector4(0, 0, -1, 1);
    // let ry: Matrix4 = new Matrix4();
    // ry.makeRotationAxis(new Vector3(0, -1, 0), Math.PI * FOV * v2.x);
    // let vy: Vector4 = base.clone().applyMatrix4(ry);

    // let rx: Matrix4 = new Matrix4();
    // rx.makeRotationAxis(new Vector3(1, 0, 0), Math.PI * FOV * v2.y);
    // let vxy: Vector4 = vy.clone().applyMatrix4(rx);

    // let vxy3: Vector3 = new Vector3(vxy.x, vxy.y, vxy.z);

    // vxy3.normalize().multiplyScalar(5);
    // let campos = new vec3();
    // Globals.camera.getWorldPosition(campos);
    // vxy3.add(campos);
    // Globals.camera.lookAt(new Vector3(vxy3.x, vxy3.y, vxy3.z));

  }
  private debugDrawMousePos(): void {
    let that = this;
    if (Globals.isDebug()) {
      if (that.mousePoint == null) {
        that.mousePoint = new PointGeo();
        Globals.scene.add(that.mousePoint);
      }
      that.mousePoint.position.set(0, 0, 0);
      that.mousePoint.rotation.set(0, 0, 0);
      that.mousePoint.updateMatrix();
      that.mousePoint.position.set(that.x, that.y, that.z);
      that.mousePoint.updateMatrix();
    }
  }
  private updateEventsSynchronously() {
    for (let [evt, k] of this._events) {
      if (k === MouseEventType.MouseMove) {
        this.mouseMove(evt.clientX, evt.clientY);
      }
      else if (k === MouseEventType.MouseUp) {
        // e.preventDefault();
        if (evt.button == 0) {
          this._lmbDown = false;
        }
        if (evt.button == 1) {
          //middle
        }
        if (evt.button == 2) {
          this._rmbDown = false;
        }
      }
      else if (k === MouseEventType.MouseDown) {
        //e.preventDefault();
        if (evt.button == 0) {
          this._lmbDown = true;
        }
        if (evt.button == 1) {
          //middle
        }
        if (evt.button == 2) {
          this._rmbDown = true;
        }
      }
    }
    this._events.clear();

    for (let evt of this._mousewheel_evt) {
      this._wheel += Math.sign(evt.deltaY);
    }
    this._mousewheel_evt = new Array<MouseWheelEvent>();
  }
}
export class VirtualController {
  public Position: Vector3 = new Vector3(0, 0, 0);
  public A: VirtualButton = new VirtualButton();
  public B: VirtualButton = new VirtualButton();
  public Trigger: VirtualButton = new VirtualButton();
  private _axis : vec2 = new vec2();

  public get Axis(): vec2 { return this._axis; }

  private c_immMoveAmt: number = 0.1;
  public get MoveLeft(): boolean { return this.Axis.x < -this.c_immMoveAmt; }
  public get MoveRight(): boolean { return this.Axis.x > this.c_immMoveAmt; }
  public get MoveUp(): boolean { return this.Axis.y > this.c_immMoveAmt; }
  public get MoveDown(): boolean { return this.Axis.y < -this.c_immMoveAmt; }

  //Joystick or Keyboard.
  public anyButtonPressed() {
    return this.A.pressed() || this.B.pressed() || this.Trigger.pressed();
  }
}

// /**
//  * @class Input
//  * @brief Manages both VR and Desktop input devices 
//  *  TODO: tablet + phone input.
//  */
export class Input {
  private _keyboard: Keyboard = null;
  private _vr: VRInputManager = null;
  private _mouse: Mouse = null;

  //The left and right controllers, these are also used to synergize kb/mouse input.
  private _right: VirtualController = new VirtualController();
  private _left: VirtualController = new VirtualController();

  get right(): VirtualController { return this._right; }
  get left(): VirtualController { return this._left; }

  get keyboard(): Keyboard { return this._keyboard; }
  get vr(): VRInputManager { return this._vr; }
  get mouse(): Mouse { return this._mouse; }

  constructor() {
    if (Globals.userIsInVR()) {
      //Let the VR input manager handle 
      //VR Input callbaclks
      let addController: any = function (g: VRGamepad) {
        if (g != null) {
          var box_mat = new THREE.MeshBasicMaterial({
            //map: this._texture,
            transparent: false,
            side: THREE.DoubleSide,
            color: 0xc9c9FF,
          });

          var box_geo = new THREE.BoxBufferGeometry(0.05, 0.05, 0.05);
          box_geo.computeBoundingBox(); // for hit area
          var box_mesh = new THREE.Mesh(box_geo, box_mat);

          g.add(box_mesh);
          if (Globals.userGroup) {
            Globals.userGroup.add(g);
          }
        }
      }

      let removeController: any = function (g: VRGamepad) {
        Globals.logInfo("Removed controller.");
        if (g.parent == Globals.scene) {
          Globals.userGroup.remove(g);
        }
      }

      this._vr = new VRInputManager(addController, removeController);
      this._vr.Verbose = Globals.isDebug();
    }
    else {
      this._keyboard = new Keyboard();
      this._mouse = new Mouse();
    }
  }
  public update(dt: number): void {
    if (Globals.userIsInVR()) {
      if (this._vr) {
        this._vr.update();
        this.updateGamepads_VR(dt);
      }
    }
    else {
      if (this._keyboard && this._mouse) {
        let cam_n: Vector3 = new Vector3();
        Globals.camera.getWorldDirection(cam_n);

        let cam_w: Vector3 = new Vector3();
        Globals.camera.getWorldPosition(cam_w);

        let lookat: Vector3 = cam_w.add(cam_n);

        this._mouse.update();
        this._keyboard.update();

        //Update WSAD the movement and other keyboard things
        this.updateAxis_Keyboard(dt, this.left);
        this.right.Axis.copy(this.left.Axis);

        //Update the positions of the VR controllers.
        this.right.Trigger.update(this.mouse.Left.pressOrHold());
        this.right.A.update(this.mouse.Right.pressOrHold());
        this.right.Position.copy(lookat);

        this.left.Trigger.update(this.mouse.Left.pressOrHold());
        this.left.A.update(this.mouse.Right.pressOrHold());
        this.left.Position.copy(lookat);
      }
    }
  }
  public postUpdate(){
    if(this._mouse){
      this._mouse.postUpdate();
    }
  }
  private updateGamepads_VR(dt: number) {
    if (this._vr._gamepads) {
      for (let i = 0; i < this._vr._gamepads.length; ++i) {
        let gp: VRGamepad = this._vr._gamepads[i];
        let vc: VirtualController = null;

        if (gp.handedness === 'left') {
          vc = this._left;
        }
        else if (gp.handedness === 'right') {
          vc = this._right;
        }

        gp.getWorldPosition(vc.Position);

        vc.Axis.x = gp.x_axis;
        vc.Axis.y = -gp.y_axis; // y axis is inverted - ?

        for (let ibut: number = 0; ibut < gp.buttons.length; ++ibut) {
          if (gp.buttons[ibut].name === 'A') {
            vc.A.update(gp.buttons[ibut].pressed);
          }
          if (gp.buttons[ibut].name === 'B') {
            vc.B.update(gp.buttons[ibut].pressed);
          }
          if (gp.buttons[ibut].name === 'trigger') {
            vc.Trigger.update(gp.buttons[ibut].pressed);
          }
        }

      }
    }
  }
  private updateAxis_Keyboard(dt: number, joy: VirtualController) {

    if (this.keyboard.SmoothAxis === true) {
      let speed = this.keyboard.SmoothAxisSpeed;
      //Interpolate the keyboard based on a speed.
      if (this.keyboard.a.pressOrHold()) {
        joy.Axis.x = Math.max(-1, joy.Axis.x - speed * dt);
      }
      else if (this.keyboard.d.pressOrHold()) {
        joy.Axis.x = Math.min(1, joy.Axis.x + speed * dt);
      }
      else {
        if (joy.Axis.x < 0) {
          joy.Axis.x = Math.min(0, joy.Axis.x + speed * dt);
        }
        else if (joy.Axis.x > 0) {
          joy.Axis.x = Math.max(0, joy.Axis.x - speed * dt);
        }
      }
      if (this.keyboard.s.pressOrHold()) {
        joy.Axis.y = Math.max(-1, joy.Axis.y - speed * dt);
      }
      else if (this.keyboard.w.pressOrHold()) {
        joy.Axis.y = Math.min(1, joy.Axis.y + speed * dt);
      }
      else {
        if (joy.Axis.y < 0) {
          joy.Axis.y = Math.min(0, joy.Axis.y + speed * dt);
        }
        else if (joy.Axis.y > 0) {
          joy.Axis.y = Math.max(0, joy.Axis.y - speed * dt);
        }
      }
    }
    else {
      //Immediate directional movement
      if (this._keyboard.w.pressOrHold()) {
        joy.Axis.y = 1;
      }
      else if (this._keyboard.s.pressOrHold()) {
        joy.Axis.y = -1;
      }
      else {
        joy.Axis.y = 0;
      }
      if (this._keyboard.a.pressOrHold()) {
        joy.Axis.x = -1;
      }
      else if (this._keyboard.d.pressOrHold()) {
        joy.Axis.x = 1;
      }
      else {
        joy.Axis.x = 0;
      }
    }

  }
}
/**
 * A viewing frustum for a camera.  Quick class to calculate point in screen.
 */
export class Frustum {
  private _ftl: Vector3 = new Vector3();
  private _ftr: Vector3 = new Vector3();
  private _fbl: Vector3 = new Vector3();
  private _ntl: Vector3 = new Vector3();
  private _nbl: Vector3 = new Vector3();
  private _ntr: Vector3 = new Vector3();

  get ftl(): Vector3 { return this._ftl; }//back topleft
  get ftr(): Vector3 { return this._ftr; }//back topright
  get fbl(): Vector3 { return this._fbl; }//back bottomleft
  get ntl(): Vector3 { return this._ntl; }//near top left
  get nbl(): Vector3 { return this._nbl; }//near bot left
  get ntr(): Vector3 { return this._ntr; }//near top right

  //private Points_fpt_ntl: Vector3;//back bottomleft
  public constructor(cam_dir: Vector3 = null, cam_pos: Vector3 = null) {
    this.construct(cam_dir, cam_pos);
  }
  //Project a point onto the screen in 3D
  public projectScreen(screen_x: number, screen_y: number) {
    return this.project(screen_x, screen_y, Globals.camera.near);
  }
  //Project a point into the screen/canvas, x and y are relative to the top left of the canvas (not the window)
  //A distance of 
  public project(screen_x: number, screen_y: number, dist: number): Vector3 {

    let wrx = screen_x / Globals.screen.elementWidth;//) * 2 - 1;
    let wry = screen_y / Globals.screen.elementHeight;//) * 2 + 1;

    let dx = this._ftr.clone().sub(this._ftl).multiplyScalar(wrx);
    let dy = this._fbl.clone().sub(this._ftl).multiplyScalar(wry);

    let back_plane: vec3 = this._ftl.clone().add(dx).add(dy);

    let cam_pos: vec3 = new vec3();
    Globals.camera.getWorldPosition(cam_pos);

    let projected: vec3 = back_plane.clone().sub(cam_pos).normalize().multiplyScalar(dist);

    projected.add(cam_pos);

    return projected;
  }
  public construct(cam_dir: vec3 = null, cam_pos: vec3 = null) {
    //Doing this the old way
    if (cam_dir === null) {
      cam_dir = new vec3();
      Globals.camera.getWorldDirection(cam_dir);
    }
    if (cam_pos === null) {
      cam_pos = new vec3();
      Globals.camera.getWorldPosition(cam_pos);
    }
    let camup = Globals.camera.up.clone().normalize();

    let nearCenter: vec3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(Globals.camera.near));
    let farCenter: vec3 = cam_pos.clone().add(cam_dir.clone().multiplyScalar(Globals.camera.far));
    let ar = Globals.screen.elementHeight / Globals.screen.elementWidth;
    let fov = THREE.Math.degToRad(Globals.camera.getEffectiveFOV());
    let tan_fov_2 = Math.tan(fov / 2.0);


    let rightVec = cam_dir.clone().cross(camup); //TODO: see if this changes things
    rightVec.normalize();

    let w_far_2 = tan_fov_2 * Globals.camera.far;
    let h_far_2 = w_far_2 * ar;
    let cup_far = camup.clone().multiplyScalar(h_far_2);
    let crt_far = rightVec.clone().multiplyScalar(w_far_2);
    this._ftl = farCenter.clone().add(cup_far).sub(crt_far);
    this._ftr = farCenter.clone().add(cup_far).add(crt_far);
    this._fbl = farCenter.clone().sub(cup_far).sub(crt_far);

    let w_near_2 = tan_fov_2 * Globals.camera.near;
    let h_near_2 = w_near_2 * ar;
    let cup_near = camup.clone().multiplyScalar(h_near_2);
    let crt_near = rightVec.clone().multiplyScalar(w_near_2);
    this._ntl = nearCenter.clone().add(cup_near).sub(crt_near);
    this._ntr = nearCenter.clone().add(cup_near).add(crt_near);
    this._nbl = nearCenter.clone().sub(cup_near).sub(crt_near);
  }
}

// //Creates a copy of another mesh's material in case we need to set custom material properties.
export class MaterialDuplicate {
  private _flashing: boolean = false;
  private _flash: number = 0;
  private _flashDir: number = 1;//-1, or 1
  private _saturation: number = 0;
  private _duration: number = 0;
  private _flashColor: Color = new Color(0, 0, 0);

  private _isUniqueMaterial: boolean = false;
  private _isUnqiueColor: boolean = false;
  private _ob_to_material: Map<Mesh, Material> = new Map<Mesh, Material>();
  private _flash_saved_material: Map<Mesh, Material> = new Map<Mesh, Material>();
  private _parent: Object3D = null;

  public constructor(parent: Object3D) {
    this._parent = parent;
  }

  private _opacity: number = 1;
  get opacity(): number {
    return this._opacity;
  }
  set opacity(val: number) {
    let that = this;

    that._opacity = val;

    this.saveMaterial();

    if (that._parent !== null) {
      that._parent.traverse(function (ob_child: any) {
        if (ob_child instanceof THREE.Mesh) {

          let mod: THREE.Mesh = ob_child as THREE.Mesh;
          if (mod) {
            if (mod.material) {
              let mat: THREE.Material = mod.material as THREE.Material;

              if (mat) {
                //Force front sided material to prevent draw order problems.
                mat.side = THREE.FrontSide;
                if (mat.transparent === false) {
                  mat.transparent = true;
                }
                mat.opacity = val;
              }
            }
          }

        }
      });
    }
  }
  public set color(val: Color) {
    this.setColor(val, null);
  }
  public setColor(val: Color, meshName: string = null): boolean {
    //The way this works, if we ever change the material color, it permanently becomes a unique material.
    let that = this;
    let colorSet: boolean = false;
    that._parent.traverse(function (ob_child: any) {
      if (ob_child instanceof Mesh) {
        let m: Mesh = ob_child as Mesh;
        if (meshName === null || m.name === meshName) {
          that.saveMaterial();
          if (Utils.setMeshColor(m, val)) {
            that._isUnqiueColor = true;
            colorSet = true;
          }
        }
      }
    });
    return colorSet;
  }
  public flash(color: Color, durationInSeconds: number, saturation: number): void {
    //Saturation from [0,1]
    //Flash this a color (like when it gets hit)
    if (this._flashing == false) {
      this._flashing = true;
      this._flashColor = color;
      this._flash = 0.000001; //set to little amount to prevent erroneous checking.
      this._saturation = Utils.clampScalar(saturation, 0, 1);
      this._duration = Utils.clampScalar(durationInSeconds, 0, 999999);
      this._flashDir = 1;

      let that = this;

      this.saveMaterial();

      that._flash_saved_material = new Map<Mesh, Material>();

      //Save emissive color for flash only.
      that._parent.traverse(function (ob_child: any) {
        if (ob_child instanceof Mesh) {
          let m: Mesh = ob_child as Mesh;
          that._flash_saved_material.set(m, m.material as Material);
          that.cloneMeshMaterial(m);
          //Blank out emissive so we get a full red.
          if (m.material && m.material instanceof MeshStandardMaterial) {
            m.material.emissive = new Color(0, 0, 0);
          }
        }
      });
    }
  }
  public update(dt: number) {
    this.updateFlash(dt);
    this.checkRestoreMaterial();
  }
  private checkRestoreMaterial() {
    if (this._isUniqueMaterial) {
      if (this._isUnqiueColor === false && this._opacity === 1 && this._flashing === false) {
        for (let key of Array.from(this._ob_to_material.keys())) {
          let m: Material = this._ob_to_material.get(key);
          key.material = m;
        }
      }
      this._isUniqueMaterial = false;
    }
  }
  private cloneMeshMaterial(m: Mesh) {
    if (m.material instanceof THREE.MeshBasicMaterial) {
      m.material = m.material.clone();
    }
    else if (m.material instanceof THREE.MeshStandardMaterial) {
      m.material = m.material.clone();
    }
    else {
      let n: number = 0;
      n++;
    }
  }
  private saveMaterial() {
    let that = this;

    if (that._isUniqueMaterial === false) {
      that._isUniqueMaterial = true;

      that._ob_to_material = new Map<Mesh, Material>();

      that._parent.traverse(function (ob_child: any) {
        if (ob_child instanceof Mesh) {

          let m: Mesh = ob_child as Mesh;

          that._ob_to_material.set(m, m.material as Material);

          that.cloneMeshMaterial(m);

        }
      });
    }

  }

  private updateFlash(dt: number) {
    if (this._flashing) {

      this._flash += dt * this._flashDir;
      if (this._flash >= this._duration * .5) {
        //Subtract any amount that went over.
        let rem = this._flash - this._duration * .5;
        this._flash -= rem;
        //reverse direction
        this._flashDir = -1;
      }

      //If we hit zero, we're done
      if (this._flash <= 0) {
        this._flash = 0;
        this._flashing = false;

        //Restore flash material.
        for (let key of Array.from(this._flash_saved_material.keys())) {
          let cc: Material = this._flash_saved_material.get(key);
          key.material = cc;
        }

        return;
      }

      let fpct: number = this._flash / (this._duration * .5) * this._saturation;

      //Lerp the flash material from the material we have saved.
      let that = this;
      for (let key of Array.from(this._flash_saved_material.keys())) {
        let mat: Material = this._flash_saved_material.get(key);

        if (mat instanceof MeshBasicMaterial || mat instanceof MeshStandardMaterial) {
          let c: Color = mat.color;
          let c2: Color = Utils.lerpColor(c, that._flashColor, fpct);
          Utils.setMeshColor(key, c2);
        }

      }
    }


  }
}

// //https://stackoverflow.com/questions/29758765/json-to-typescript-class-instance
// class SerializationHelper {
//   static toInstance<T>(obj: T, json: string) : T {
//       var jsonObj  = JSON.parse(json);

//       if (typeof obj["fromJSON"] === "function") {
//           obj["fromJSON"](jsonObj);
//       }
//       else {
//           for (var propName in jsonObj) {
//               obj[propName] = jsonObj[propName]
//           }
//       }

//       return obj;
//   }
// }
