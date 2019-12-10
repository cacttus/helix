
/**
 * @file Main.ts
 * @author Derek Page
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
import * as THREE from 'three';
import { Color, Box3, Object3D } from 'three';
import { Globals, GameState, ResizeMode } from './Globals';
import { Utils } from './Utils';
import { HashSet, MultiMap } from './Base';
import * as Files from './Files';
import { Int, toInt } from './Int';
import { PhysicsObject3D } from './Physics3D';
import { Atlas, ImageResource, WorldView25D, Sprite25D, CollisionHandling, Animation25D } from './Helix25D';
import { vec2, vec3, ivec2 } from './Math';
import { Cell, TileBlock } from './TileGrid';

export enum HandGesture {
  None = "none",
  Grab = "grab",
  Poke = "poke"
}
/**
 * @class Hand
 * @description A hand object that interacts with the game world.
 */
export class Hand extends THREE.Object3D {
  public Gesture: HandGesture = HandGesture.None;
  public Grabbed: Sprite25D = null;
  // public get ActionPoint (): Object3D {return this._actionPoint;}
  private _actionPoint: Object3D = null;

  public HandSprite: Sprite25D = null;
  public Held: Sprite25D = null;

  private _world: WorldView25D = null;
  public get ActionPoint(): Object3D {
    return this._actionPoint;
  }

  public constructor(world: WorldView25D) {
    super();
    this._world = world;
    this.HandSprite = new Sprite25D(g_mainWorld.Atlas);
    this.HandSprite.Name = "Hand_Sprite";
    this.HandSprite.Animation.addTileFrame(new ivec2(10, 5), g_mainWorld.Atlas, new ivec2(1, 1), new ivec2(1, 1), CollisionHandling.Ignore, toInt(0), toInt(0));
    this.HandSprite.Animation.addTileFrame(new ivec2(11, 5), g_mainWorld.Atlas, new ivec2(1, 1), new ivec2(1, 1), CollisionHandling.Ignore, toInt(0), toInt(0));
    this.HandSprite.Animation.addTileFrame(new ivec2(12, 5), g_mainWorld.Atlas, new ivec2(1, 1), new ivec2(1, 1), CollisionHandling.Ignore, toInt(0), toInt(0));
    this.HandSprite.R3Parent = this;
    this.HandSprite.Animation.setDefault();
    this.HandSprite.Animation.setKeyFrame(0, this.HandSprite.Animation.TileData);
    this.HandSprite.Position.set(-0.5, 0.5, 0);
    world.addObject25(this.HandSprite);
  }
  public getActionPointLocation(): vec3 {
    if (this._actionPoint) {
      let v: vec3 = new vec3();
      this._actionPoint.getWorldPosition(v);
      return v;
    }
    return null;
  }
  public update(dt: number) {
    //super.update(dt);

    //Update position
    if (Globals.userIsInVR()) {
      this.position.copy(Globals.input.right.Position);
    }
    else {
      let hand_pos_final: vec3 = null;

      if (Globals.input.mouse.Left.pressOrHold()) {
        if(Globals.input.mouse.Left.pressed()){
          Globals.audio.play(Files.Audio.HandGrab, this.position);
        }
        this.HandSprite.Animation.setKeyFrame(2, this.HandSprite.Animation.TileData);
      }
      else {
        this.HandSprite.Animation.setKeyFrame(0, this.HandSprite.Animation.TileData);
      }

      if (this._world.InputControls.MovingPlayer) {
        //Player is moving.
        hand_pos_final = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, 4);
      }
      else {
        //Project the hand onto the world.  This is for PC only. 
        let p1 = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, Globals.camera.Near);
        let p2 = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, Globals.camera.Far);
        let projected_world = Utils.project(p1, p2, WorldView25D.Normal, this._world.position);

        //Push the hand out a little bit so it isn't stuck in the world.
        let push_amt: number = 1.9;
        let push_out = p1.clone().sub(p2).normalize().multiplyScalar(push_amt);

        hand_pos_final = projected_world.clone().add(push_out);

      }

      //hardcode the z to a solid position so we can easily project it.
      this.position.copy(hand_pos_final);
    }

    if (this.Held === null) {
      //Grab stuff
      if (Globals.input.mouse.Left.pressed()) {
        this.Gesture = HandGesture.Grab;
        this.Grabbed = this.grabTileOrSprite();
      }
      else {
        this.Gesture = HandGesture.None;
      }
    }
    else {

      if (Globals.input.mouse.Left.releaseOrUp()) {
        //Essentially this would work best if we used a PhysicsObject with velocity and gravity.
        this.Held.R3Parent = null;
        this.Held = null;
        this.Gesture = HandGesture.None;
        if (Globals.input.mouse.Left.released()) {
          Globals.audio.play(Files.Audio.HandRelease, this.position);
        }
      }
    }

  }
  public grabTileOrSprite(): Sprite25D {
    let ret: Sprite25D = null;

    //Grap Tile Sprite.
    let ap_world = this.getActionPointLocation();
    if (ap_world) {
      let ap_map = this._world.MasterMap.worldPointToMapPoint(ap_world);

      let c: Cell = this._world.MasterMap.Area.Grid.GetCellForPoint_WorldR3(ap_map);
      if (c !== null) {
        let blocks: TileBlock[] = c.getOrderedBlockArrayTopDown();
        if (blocks.length > 0) {
          if (blocks[0].SpriteRef) {

            //Grab the Block
            if (blocks[0].SpriteRef.Properties.get("gesture") === HandGesture.Grab) {

              ret = this._world.blockTileToSprite(blocks[0], c);

              ret.R3Parent = this.ActionPoint;
              this.Held = ret;

            }

            //Do callback if needed
            // if (blocks[0].SpriteRef.GestureCallback) {
            //   blocks[0].SpriteRef.GestureCallback(blocks[0].SpriteRef, blocks[0], this);
            // }

          }

        }
      }
    }
    else {
      Globals.logError("Could not find action point for tickler.");
    }
    return ret;
  }
}

let g_ambientlight: THREE.AmbientLight = null;
let axis: THREE.AxesHelper = null;
let gridhelper: THREE.GridHelper = null;
let g_hand: Hand = null;
let g_atlas: Atlas = null;
let g_mainWorld: WorldView25D = null;

$(document).ready(function () {
  Utils.loadingDetails("Initializing engine.");

  Globals.init(800, 800, ResizeMode.FitAndCenter, new Color(0, 0, 0), Utils.getBoolParam("perspective")).then((value: boolean) => {
    Globals.prof.frameStart();
    loadResources();
  });

  if(!Globals.isDebug()){
    //Hide the mouse
    $('body').css('cursor' , 'none');
  }


});
function loadResources() {
  //https://threejs.org/docs/#manual/en/introduction/Animation-system
  // this should really be handled by a promise.
  g_atlas = new Atlas(
    1 as Int, 1 as Int, 1 as Int, 1 as Int,
    1 as Int, 1 as Int,
    16 as Int, 16 as Int, './dat/img/tiles.png', function (that: ImageResource) {
      //Load the hnad
      Globals.models.loadModel(Files.Model.Hand).then(() => {
        initializeGame();
      }, () => {
        Globals.logError("Could not start game, model loaded with error.")
      });
    });
}

function initializeGame() {
  createWorld();

  g_ambientlight = new THREE.AmbientLight(new Color(1, 1, 1));
  Globals.scene.add(g_ambientlight);

  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(2);
    Globals.scene.add(axis);
    gridhelper = new THREE.GridHelper(100, 30, new THREE.Color(1, 0.6, 1), new THREE.Color(0.6, 1, 1))
    Globals.scene.add(gridhelper);
  }

  Globals.prof.frameEnd();
  $('#loadingContainer').hide();

  Globals.startGameEngine(gameLoop);
}
function createWorld() {
  Utils.loadingDetails("Creating world.");
  let validator: Array<string> = ['gesture'];

  //Load Resources
  g_mainWorld = new WorldView25D(g_atlas);
  g_mainWorld.init(2048 as Int, validator);
  Globals.scene.add(g_mainWorld);

  g_hand = new Hand(g_mainWorld);
}
function gameLoop(dt: number) {
  Globals.prof.begin("main game loop");
  // Globals.renderer.setClearColor(new THREE.Color(1,0,1));

  g_hand.update(dt);
  //Listen for game start
  if (Globals.gameState === GameState.Title) {
    if (Globals.input.right.A.pressed() || Globals.input.right.Trigger.pressed() || Globals.input.left.A.pressed() || Globals.input.left.Trigger.pressed()) {
      Globals.gameState = GameState.Play;
      //You can only play music when the user has interacted wit the page.
      // Globals.audio.playMusic(Files.Audio.MusicBeepy);
    }
  }

  g_mainWorld.update(dt);

  Globals.prof.end("main game loop");
}
