/**
 * @file Input.ts
 * @author Derek Page
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
import * as THREE from 'three';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';
import { vec4, vec3, vec2, ivec2 } from './Math';
import { Globals } from './Globals';
import {PointGeo} from './Graphics';
import { VRInputManager, VRGamepad, VRButton } from './Gamepad';

enum ButtonState { Press, Hold, Release, Up }
export class VirtualButton {
  private _state: ButtonState = ButtonState.Up;
  get state(): ButtonState { return this._state; }
  public pressed(): boolean { return this.state === ButtonState.Press; }
  public released(): boolean { return this.state === ButtonState.Release; }
  public down(): boolean { return this.state === ButtonState.Hold; }
  public pressOrHold(): boolean { return this.state === ButtonState.Hold || this.state == ButtonState.Press; }
  public releaseOrUp(): boolean { return this.state === ButtonState.Release || this.state == ButtonState.Up; }
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
/**
 * Keyboard Input class
 */
enum KeyboardEventType { Up, Down }
class KbEvent {
  public evt: KeyboardEvent;
  public type: KeyboardEventType;
  public constructor(e: KeyboardEvent, t: KeyboardEventType) {
    this.evt = e;
    this.type = t;
  }
}
export class Keyboard {
  private _keys: Map<Int, VirtualButton> = new Map<Int, VirtualButton>();

  get w(): VirtualButton { return this.getKey(87 as Int); }
  get s(): VirtualButton { return this.getKey(83 as Int); }
  get a(): VirtualButton { return this.getKey(65 as Int); }
  get d(): VirtualButton { return this.getKey(68 as Int); }

  public get Shift(): VirtualButton { return this.getKey(16 as Int); }
  public get Control(): VirtualButton { return this.getKey(17 as Int); }

  private _smoothAxis: boolean = false;  // Whether the X or Y axis smoothly transitions from -1, 0, 1.
  public get SmoothAxis(): boolean { return this._smoothAxis; }
  public set SmoothAxis(x: boolean) { this._smoothAxis = x; }

  private _smoothAxisSpeed: number = 10;  // Whether the X or Y axis smoothly transitions from -1, 0, 1.
  public get SmoothAxisSpeed(): number { return this._smoothAxisSpeed; }
  public set SmoothAxisSpeed(x: number) { this._smoothAxisSpeed = x; }

  private _events: Array<KbEvent> = new Array<KbEvent>();

  constructor() {
    let that = this;
    window.addEventListener("keydown", function (e: KeyboardEvent) {
      that._events.push(new KbEvent(e, KeyboardEventType.Down));
    });
    window.addEventListener("keyup", function (e: KeyboardEvent) {
      that._events.push(new KbEvent(e, KeyboardEventType.Up));
    });
  }
  public update() {
    //Pump Events
    for (let kb of this._events) {
      let down: boolean = (kb.type === KeyboardEventType.Down);

      this.getKey(kb.evt.keyCode as Int, true).update(down);
    }
    this._events = new Array<KbEvent>();
  }
  public reset() {
    for (let [k, v] of this._keys) {
      v.update(false);
    }
  }
  public getKey(ord: Int, add: boolean = false): VirtualButton {
    let key: VirtualButton = this._keys.get(ord);;
    if (!key) {
      key = new VirtualButton();
      this._keys.set(ord, key);
    }
    return key;
  }

}
enum MouseEventType { MouseUp, MouseDown, MouseMove };
class MsEvent {
  public evt: MouseEvent;
  public type: MouseEventType;
  public constructor(e: MouseEvent, t: MouseEventType) {
    this.evt = e;
    this.type = t;
  }
}
export class Mouse extends vec2 {
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

  private _events: Array<MsEvent> = new Array<MsEvent>();
  private _mousewheel_evt: Array<MouseWheelEvent> = new Array<MouseWheelEvent>();
  private curView: vec3 = new vec3(0, 0, -1);

  public constructor() {
    super();
    this.registerDocumentCallbacks();
  }
  public postUpdate() {
    this._wheel = 0;
  }
  public update() {
    this.updateEventsSynchronously();
    this.Left.update(this._lmbDown);
    this.Right.update(this._rmbDown);
  }
  public reset() {
    this.Left.update(false);
    this.Right.update(false);
  }
  private registerDocumentCallbacks() {
    //Here we just set the mouse information either last, or this frame in order to update the mouse
    //at the same synchronous position in every browser.
    let that = this;
    document.addEventListener('mouseup', function (e: MouseEvent) {
      e.preventDefault();
      that._events.push(new MsEvent(e, MouseEventType.MouseUp));
    });
    document.addEventListener('mousedown', function (e: MouseEvent) {
      e.preventDefault();
      that._events.push(new MsEvent(e, MouseEventType.MouseDown));
    });
    document.addEventListener('contextmenu', function (e: MouseEvent) {
      e.preventDefault();
    });
    document.addEventListener('wheel', function (e: MouseWheelEvent) {
      that._mousewheel_evt.push(e);
    });
    //var controls = new OrbitControls.default();
    document.addEventListener('mousemove', function (e: MouseEvent) {
      e.preventDefault();
      that._events.push(new MsEvent(e, MouseEventType.MouseMove));
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

    this.debugDrawMousePos();
  }
  private flycamRotate(newx: number, newy: number) {
    let dx = newx - this.x;
    let dy = newy - this.y;

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
  private shittyRotate() {
    // //Look at the point in the screen projected into 3D
    // let v2 = Globals.screen.getCanvasRelativeXY(e.clientX, e.clientY);

    // v2.x = (v2.x / Globals.screen.canvas.width) * 2 - 1;
    // v2.y = ((Globals.screen.canvas.height - v2.y) / Globals.screen.canvas.height) * 2 - 1;

    // let FOV = 1;//Increase to get more FOV 

    // let base = new Vector4(0, 0, -1, 1);
    // let ry: Matrix4 = new Matrix4();
    // ry.makeRotationAxis(new vec3(0, -1, 0), Math.PI * FOV * v2.x);
    // let vy: Vector4 = base.clone().applyMatrix4(ry);

    // let rx: Matrix4 = new Matrix4();
    // rx.makeRotationAxis(new vec3(1, 0, 0), Math.PI * FOV * v2.y);
    // let vxy: Vector4 = vy.clone().applyMatrix4(rx);

    // let vxy3: vec3 = new vec3(vxy.x, vxy.y, vxy.z);

    // vxy3.normalize().multiplyScalar(5);
    // let campos = new vec3();
    // Globals.camera.getWorldPosition(campos);
    // vxy3.add(campos);
    // Globals.camera.lookAt(new vec3(vxy3.x, vxy3.y, vxy3.z));

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
      that.mousePoint.position.set(that.x, that.y, 0);
      that.mousePoint.updateMatrix();
    }
  }
  private updateEventsSynchronously() {
    for (let ms of this._events) {
      if (ms.type === MouseEventType.MouseMove) {
        this.mouseMove(ms.evt.clientX, ms.evt.clientY);
      }
      else if (ms.type === MouseEventType.MouseUp) {
        // e.preventDefault();
        if (ms.evt.button == 0) {
          this._lmbDown = false;
        }
        if (ms.evt.button == 1) {
          //middle
        }
        if (ms.evt.button == 2) {
          this._rmbDown = false;
        }
      }
      else if (ms.type === MouseEventType.MouseDown) {
        //e.preventDefault();
        if (ms.evt.button == 0) {
          this._lmbDown = true;
        }
        if (ms.evt.button == 1) {
          //middle
        }
        if (ms.evt.button == 2) {
          this._rmbDown = true;
        }
      }
    }
    this._events = new Array<MsEvent>();

    for (let evt of this._mousewheel_evt) {
      this._wheel += Math.sign(evt.deltaY);
    }
    this._mousewheel_evt = new Array<MouseWheelEvent>();
  }
}
export class VirtualController {
  public Position: vec3 = new vec3(0, 0, 0);
  public A: VirtualButton = new VirtualButton();
  public B: VirtualButton = new VirtualButton();
  public Trigger: VirtualButton = new VirtualButton();
  private _axis: vec2 = new vec2();

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
export enum Hand { None, Left, Right, Both }
export class Input {
  private _keyboard: Keyboard = null;
  private _vr: VRInputManager = null;
  private _mouse: Mouse = null;

  //The left and right controllers, these are also used to synergize kb/mouse input.
  private _right: VirtualController = new VirtualController();
  private _left: VirtualController = new VirtualController();
  private _movementHand: Hand = Hand.Left;

  get right(): VirtualController { return this._right; }
  get left(): VirtualController { return this._left; }

  get keyboard(): Keyboard { return this._keyboard; }
  get vr(): VRInputManager { return this._vr; }
  get mouse(): Mouse { return this._mouse; }

  public get MovementHand(): Hand { return this._movementHand; }
  public set MovementHand(x: Hand) { this._movementHand = x; }

  public get MovementController(): VirtualController {
    if (this.MovementHand === Hand.Right) {
      return this.right;
    }
    else if (this.MovementHand === Hand.Left) {
      return this.left;
    }
    else if (this.MovementHand === Hand.Both) {
      return this.right;
    }
    return null;
  }
  public get ActionController(): VirtualController {
    if (this.MovementHand === Hand.Right) {
      return this.left;
    }
    else if (this.MovementHand === Hand.Left) {
      return this.right;
    }
    else if (this.MovementHand === Hand.Both) {
      return this.left;
    }
    return null;
  }

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
      this.updateGamepadsPC(dt);
    }
  }
  public postUpdate() {
    if (this._mouse) {
      this._mouse.postUpdate();
    }
  }
  private updateGamepadsPC(dt: number) {
    if (this._keyboard && this._mouse) {

      this._mouse.update();
      this._keyboard.update();

      if (!document.hasFocus()) {
        this._mouse.reset();
        this._keyboard.reset();
      }

      //Update WSAD the movement and other keyboard things for the configured controller.
      let move: VirtualController = this.MovementController;
      let act: VirtualController = this.ActionController;

      if (move) {
        this.updateAxis_Keyboard(dt, move);
        if (act && this.MovementHand === Hand.Both) {
          //Copy the movement to the other controller.
          move.Axis.copy(act.Axis);
        }
      }

      //Update the positions of the VR controllers.
      let cam_n: vec3 = Globals.camera.CamDirBasis.clone();
      let cam_w = Globals.camera.CamPos.clone();
      let lookat: vec3 = cam_w.add(cam_n);

      this.right.Trigger.update(this.mouse.Left.pressOrHold());
      this.right.A.update(this.mouse.Right.pressOrHold());
      this.right.Position.copy(lookat);

      this.left.Trigger.update(this.mouse.Left.pressOrHold());
      this.left.A.update(this.mouse.Right.pressOrHold());
      this.left.Position.copy(lookat);
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
