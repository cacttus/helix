/**
 * @file Assets.ts
 * @description Handles loading model, image and sound asset files.
 * @author Derek Page
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as THREE from 'three';
import * as Files from './Files';
import { vec4, vec3, vec2, ivec2 } from './Math';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';
import { PhysicsObject3D, PhysicsManager3D } from './Physics3D';
import * as GLTFLoader_ from 'three/examples/jsm/loaders/GLTFLoader';
import { Globals } from './Globals';
import { Utils } from './Utils';
//TODO: remove Dictionary, replace with HashMap
import { Dictionary } from "./Base";

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
  public play(file: Files.Audio, pos: vec3, loop: boolean = false, cache: boolean = true) {
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
  private calcSoundDist(pos: vec3): number {
    if (pos != null) {
      let dist: number = pos.clone().sub(Globals.player.WorldPosition).length();

      dist = Utils.clampScalar(this._maxDist - dist, 0, this._maxDist);

      let n = 0;
      n++;
      Globals.logDebug("Sound distance: " + dist)
      return dist;
    }
    else {
      return 1;
    }
  }
  private loadAndPlaySound(file: string, loop: boolean, pos: vec3): void {
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
      Globals.logDebug("Playing music " + music_file)
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
        Globals.logDebug("Playing music " + music_file)
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
export interface AfterLoadModel { (success: boolean, arr: Array<THREE.Object3D>, gltf: any): THREE.Object3D; };
export class ModelManager {
  private _cache: Map<string, GLTFLoader_.GLTF> = new Map<string, GLTFLoader_.GLTF>();
  private _modelBaseDir: string = './dat/model/';

  constructor() {
  }
  private qualifyFilename(name:string){
    return this._modelBaseDir + name;
  }
  public loadModel(filename: Files.Model): Promise<boolean> {
    //afterLoad - called after model loade.d
    //obj_names_in_scene is the list of object names that we search for in the GLTF file
    //obj_names_in_scene must not be enull if afterload is being used.

    return new Promise<boolean>((resolve, reject) => {
      Globals.logDebug('loading model "' + filename + '".')
      let that = this;
      let loader = new GLTFLoader_.GLTFLoader();
      let szfile = this.qualifyFilename(filename);
      loader.load(
        szfile,
        function (gltf: GLTFLoader_.GLTF) {
          let success: boolean = true;

          that._cache.set(szfile, gltf);

          Globals.logDebug('...loaded model "' + filename + '" -- success.');

          resolve();
        },
        function (xhr: any) {
          Globals.logInfo('model ' + (xhr.loaded / xhr.total * 100).toFixed(2) + '% loaded.');
        },
        function (error: any) {
          Globals.logInfo('Error loading "' + szfile + '" : ' + error);
          reject();
        }
      );//Loader.load
    });//Promise()
  }
  public getSceneObject(filename: string, objectName: string): THREE.Object3D {
    //Retrieves an object from a loaded scene.
    let scene = this._cache.get(this.qualifyFilename(filename));
    if (!scene) {
      return null;
    }
    let obj = scene.scene.getObjectByName(objectName);
    if (!obj) {
      return null;
    }
    return obj;
  }

}





// class ParticleParams {
//   public Count: IAFloat = new IAFloat(10, 20);
//   public Speed: IAFloat = new IAFloat(70, 70); //m/s
//   public Position: vec3 = new vec3();
//   public Scale_Delta: vec3 = new vec3(0, 0, 0);
//   public InitialScale: IAVec3 = new IAVec3(new vec3(1, 1, 1), new vec3(1, 1, 1));
//   public UniformScale: boolean = false;
//   public Rotation_Delta: vec3 = new vec3(0, 0, 0);
//   public Color: IAVec3 = new IAVec3(new vec3(0, 0, 0), new vec3(1, 1, 1));
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
//       let sv: vec3 = params.InitialScale.calc();
//       if (params.UniformScale) {
//         sv.x = sv.y = sv.z;
//       }
//       p.scale.copy(sv);
//       p.OpacityDelta = params.Opacity.calc();
//     }
//   }
//   public createBossDieParticles(pos: vec3) {
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
//   public createShipDieParticles(pos: vec3) {
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
//   public createItemParticles(pos: vec3) {
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
//   public createShipHitParticles(pos: vec3) {
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
//   public createBlasterParticlels(pos: vec3, color: Color) {
//     let params: ParticleParams = new ParticleParams();
//     params.Count = new IAFloat(2, 4);
//     params.Position.copy(pos);
//     params.Rotation_Delta.x = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.y = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Rotation_Delta.z = Random.float(-Math.PI * 2, Math.PI * 2);
//     params.Scale_Delta.x = params.Scale_Delta.y = params.Scale_Delta.z = 0;// new vec3(1,1,1);//Random.float(-2, -0.3);
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
//   private _target: vec3 = new vec3(0, 0, 0);

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
//     let cam_dir: vec3 = new vec3();
//     Globals.camera.getWorldDirection(cam_dir);
//     let right: vec3 = Globals.camera.up.clone().cross(cam_dir);
//     let up = cam_dir.clone().cross(right).normalize();

//     //target pos
//     let lookat: vec3 = Globals.player.position.clone().add(cam_dir.multiplyScalar(10).sub(up).multiplyScalar(2));
//     let target: vec3 = lookat.clone().sub(this.position);

//     //let smooth:vec3 = Utils.cosineInterpolate()

//     this.position.add(target.multiplyScalar(0.25));

//     super.update(dt);
//   }
// }
