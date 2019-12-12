
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
import { Cell, TileBlock, TileLayerId } from './TileGrid';

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

  public HandSprite: Sprite25D = null;
  public Held: Sprite25D = null;

  private _world: WorldView25D = null;

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
    this.HandSprite.Position.set(0, 0, 0);//We now add a pixel offset-0.5, 0.5, 0);
    world.addObject25(this.HandSprite);
  }

  private pv(v: vec3): string {
    return "" + v.x + "," + v.y + "," + v.z;
  }
  private curView: vec3 = new vec3(0, 0, -1);
  private flycamRotate() {
    let dx = Globals.input.mouse.dx;
    let dy = Globals.input.mouse.dy;

    let maxPixel = 8;

    if (Math.abs(dx) > maxPixel) { dx = Math.sign(dx) * maxPixel }
    if (Math.abs(dy) > maxPixel) { dy = Math.sign(dy) * maxPixel }

    let campos = Globals.camera.CamPos.clone();

    let camdir = Globals.camera.CamDirBasis.clone();//new vec3();

    let rot_speed = 0.01; // Change this to change rotation speed.

    let right = Globals.camera.CamRightBasis.clone(); //camdir.clone().cross(Globals.camera.up).normalize();
    let down = Globals.camera.CamUpBasis.clone().multiplyScalar(-1); //Globals.camera.up.clone().normalize().multiplyScalar(-1);

    this.curView.add(right.multiplyScalar(dx * rot_speed));
    this.curView.add(down.multiplyScalar(dy * rot_speed));

    Globals.camera.Camera.lookAt(this.curView.clone().add(campos));

    Globals.camera.updateAfterMoving();
  }
  private projectMouse(sx: number, sy: number) {
    //Project the hand onto the world.  This is for PC only. 
    let p1 = Globals.screen.project3D(sx, sy, Globals.camera.Near);
    let p2 = Globals.screen.project3D(sx, sy, Globals.camera.Far);
    let projected_world = Utils.project(p1, p2, WorldView25D.Normal, this._world.position);

    if (!projected_world) {
      projected_world = new vec3(0, 0, 0);
    }

    //Push the hand out a little bit so it isn't stuck in the world.
    let push_amt: number = 1.9;
    let push_out = p1.clone().sub(p2).normalize().multiplyScalar(push_amt);

    let v = projected_world.clone().add(push_out);
    return v;
  }
  public update(dt: number) {
    //super.update(dt);

    //Update position
    if (Globals.userIsInVR()) {
      this.position.copy(Globals.input.right.Position);
    }
    else {
      let hand_pos_final: vec3 = new vec3(0, 0, 0);

      if (Globals.input.mouse.Left.pressOrHold()) {
        this.HandSprite.Animation.setKeyFrame(2, this.HandSprite.Animation.TileData);
      }
      else {
        this.HandSprite.Animation.setKeyFrame(0, this.HandSprite.Animation.TileData);
      }

      if (this._world.InputControls.MovingPlayer) {
        if (Globals.input.mouse.Left.pressOrHold()) {
          this.flycamRotate();
        }
        //Player is moving.
        hand_pos_final = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, 4);
      }
      else {
        hand_pos_final = this.projectMouse(Globals.input.mouse.x, Globals.input.mouse.y);

        this.updateHover();
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
        this.dropTile(this.Held);
        this.Held.R3Parent = null;
        this.Held.R3Offset.set(0, 0, 0);
        this._grabbedBlock = null;
        this.Held = null;
        this.Gesture = HandGesture.None;
      }
    }

  }
  private dropTile(sprite: Sprite25D) {
    let abort: boolean = false;
    //  if (this._grabbedBlock != null) {
    let layer = this._grabbedBlock.Layer;
    // if (layer === TileLayerId.Unset) {
    //   layer = sprite.Layer as Int;
    // }
    if (layer !== TileLayerId.Unset) {
      let c = this.pickCell();
      if (c != null) {
        if (!c.canAddBlock(this._grabbedBlock, this._grabbedBlock.Layer)) {
          abort = true;
        }
        else {
          c.addBlock(this._grabbedBlock, this._grabbedBlock.Layer);
          Globals.audio.play(Files.Audio.HandRelease, this.position);
        }
      }
      else {
        Globals.logWarn("Cell was null for dropping object, aborted.");
        abort = true;
      }
    }
    else {
      Globals.logError("Both Sprite and tileblock layer were not set, could not drop sprite.")
      abort = true;
    }
    // }

    if (abort) {
      //Abort the drop, something went wrong.
      this._grabbedBlock.cell.addBlock(this._grabbedBlock, this._grabbedBlock.Layer);
      Globals.audio.play(Files.Audio.Invalid, this.position);
    }


  }
  private getPixelOffset(): vec3 {
    //offset of the hand sprite in pixels in R3 space
    let n = Utils.getWorldDirection(this);
    let u = Utils.getWorldUp(this);
    let r = u.clone().cross(n);

    let pxy = this._world.Atlas.pixelOffsetR3(toInt(2), toInt(9), u.clone(), r.clone());
    return pxy;
  }
  private getActionPointLocation(): vec3 {
    //returns the center position of our hand sprite.
    let pos = Utils.getWorldPosition(this);
    let pxy = this.getPixelOffset();

    pxy.add(pos);
    return pxy;
  }
  private _grabbedBlock: TileBlock = null;
  public grabTileOrSprite(): Sprite25D {
    let ret: Sprite25D = null;

    if (this._world.HoverBlock) {
      Globals.audio.play(Files.Audio.HandGrab, this.position);
      ret = this._world.blockTileToSprite(this._world.HoverBlock);
      this._world.HoverBlock.cell.removeBlock(this._world.HoverBlock);
      this._world.HoverBlock.Verts = null;
      
      ret.R3Parent = this;
      ret.R3Offset = this.getPixelOffset().add(new vec3(-0.5, 0.5, -0.01));//-0.01 pushes the rock behind hand, 0.5 centers the sprite
      this.Held = ret;
      this._grabbedBlock = this._world.HoverBlock;//Keep the block stored in case we mess up
      this._world.HoverBlock = null;
    }
    else {
      Globals.audio.play(Files.Audio.Miss, this.position);
    }

    return ret;
  }
  private pickCell(): Cell {
    //returns the cell underneath the mouse cursor
    let ap_world = this.getActionPointLocation();
    let ap_map = this._world.MasterMap.worldPointToMapPoint(ap_world);
    let c: Cell = this._world.MasterMap.Area.Grid.GetCellForPoint_MapPointR3(ap_map);
    return c;
  }
  private updateHover() {
    if (Globals.input.mouse.moved) {
      let c: Cell = this.pickCell();
      let set: boolean = false;
      if (c !== null) {

        let blocks: TileBlock[] = c.getOrderedBlockArrayTopDown();
        if (blocks.length > 0) {
          if (this.Held !== null) {
            //draw hover on placable objects.
            if (c.canAddBlock(this._grabbedBlock, this._grabbedBlock.Layer)) {
              this._world.HoverBlock = blocks[0];
              set = true;
            }
          }
          else {
            //draw hover on pickable objects
            if (blocks[0].SpriteRef) {
              //Grab the Block
              if (blocks[0].SpriteRef.getProperty("gesture") === HandGesture.Grab) {
                this._world.HoverBlock = blocks[0];
                set = true;
              }
            }
          }
        }
      }

      if (!set) {
        this._world.HoverBlock = null;
      }

    }
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

  if (!Globals.isDebug()) {
    //Hide the mouse
    $('body').css('cursor', 'none');
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
      Globals.audio.playMusic(Files.Audio.Music);
    }
  }

  g_mainWorld.update(dt);

  Globals.prof.end("main game loop");
}
