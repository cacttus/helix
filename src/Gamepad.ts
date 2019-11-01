import * as THREE from 'three';
import {Globals} from './Globals';

export class VRButton {
  public name: string; //'button_'+ i,
  public value: any; // button.value,
  public touched: boolean = false; //button.touched,
  public pressed: boolean = false; //button.pressed,
  public primary: boolean = false;;
}

export class VRInputManager {
  public _gamepads: Array<VRGamepad> = new Array<VRGamepad>();
  private _initMsgs: boolean = false;
  public Verbose = true;

  public static supported_controllers: any = {
    //////////////////
    //              //
    //   Daydream   //
    //              //
    //////////////////
    'Daydream Controller': {

      style: 'daydream',


      //  THUMBPAD
      //  Both a 2D trackpad and a button with both touch and press. 
      //  The Y-axis is “Regular”.
      //
      //              Top: Y = -1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = +1

      axes: [{ name: 'thumbpad', indexes: [0, 1] }],
      buttons: ['thumbpad'],
      primary: 'thumbpad'
    },
    //////////////
    //          //
    //   Vive   //
    //          //
    //////////////
    'OpenVR Gamepad': {
      style: 'vive',
      //  THUMBPAD
      //  Both a 2D trackpad and a button. Its Y-axis is “Goofy” -- in
      //  contrast to Daydream, Oculus, Microsoft, etc.
      //
      //              Top: Y = +1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = -1
      //
      //  Vive is the only goofy-footed y-axis in our support lineup so to
      //  make life easier on you WE WILL INVERT ITS AXIS in the code above.
      //  This way YOU don’t have to worry about it. 

      axes: [{ name: 'thumbpad', indexes: [0, 1] }],
      buttons: [


        //  THUMBPAD
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbpad',


        //  TRIGGER
        //  Has very interesting and distinct behavior on Chromium.
        //  The threshold for releasing a pressed state is higher during
        //  engagement and lower during release.
        //
        //  Chromium
        //  if( value >  0.00 ) isTouched = true else isTouched = false
        //  if( value >= 0.55 ) isPressed = true   UPON ENGAGING
        //  if( value <  0.45 ) isPressed = false  UPON RELEASING
        //
        //  Firefox
        //  if( value >= 0.10 ) isTouched = isPressed = true
        //  if( value <  0.10 ) isTouched = isPressed = false
        //  --------------------------------------------------------------
        //  value:     Analog 0 to 1.
        //  isTouched: Duplicates isPressed in FF, independent in Chrome.
        //  isPressed: Corresponds to value.

        'trigger',


        //  GRIP
        //  Each Vive controller has two grip buttons, one on the left and
        //  one on the right. They are not distinguishable -- pressing 
        //  either one will register as a press with no knowledge of which
        //  one was pressed.
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'grip',


        //  MENU
        //  The menu button is the tiny button above the thumbpad -- NOT
        //  the one below it.
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'menu'
      ],
      primary: 'trigger'
    },
    ////////////////
    //            //
    //   Oculus   //
    //            //
    ////////////////
    'Oculus Touch (Right)': {
      //  Previously I’d named the style “Rift” and referred to this as a 
      // “Rift” in the comments because it’s so much easier to write and to 
      //  say than “Oculus”. Lazy, right? But deep down in your dark heart 
      //  I know you agree with me. I’ve changed it all to “oculus” now 
      //  because that’s what both the headset and the controllers report 
      //  themselves as. There’s no mention of “Rift” in those ID strings at
      //  all. I felt in the end consistency was better than ease.

      style: 'oculus',


      //  THUMBSTICK
      //  Oculus’s thumbstick has axes values and is also a button.
      //  The Y-axis is “Regular”.
      //
      //              Top: Y = -1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = +1

      axes: [{ name: 'thumbstick', indexes: [0, 1] }],
      buttons: [


        //  THUMBSTICK
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbstick',


        //  TRIGGER
        //  Oculus’s trigger in Chromium is far more fire-happy than 
        //  Vive’s. Compare these thresholds to Vive’s trigger. 
        //
        //  Chromium
        //  if( value >  0.0 ) isTouched = true else isTouched = false
        //  if( value >= 0.1 ) isPressed = true else isPressed = false
        //
        //  Firefox
        //  if( value >= 0.1 ) isTouched = isPressed = true
        //  if( value <  0.1 ) isTouched = isPressed = false
        //  --------------------------------------------------------------
        //  value:     Analog 0 to 1.
        //  isTouched: Duplicates isPressed in FF, independent in Chrome.
        //  isPressed: Corresponds to value.

        'trigger',


        //  GRIP
        //  Oculus’s grip button follows the exact same press thresholds
        //  as its trigger.

        'grip',


        //  A B X Y
        //  Oculus has two old-school video game buttons, A and B. (On the
        //  left-hand controller these are X and Y.)
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'A', 'B',


        //  THUMBREST
        //  Oculus has an inert base “button” that’s really just a resting
        //  place for your thumb. It does NOT report press.
        //  --------------------------------------------------------------
        //  value:     Always 0.
        //  isTouched: YES has real touch detection.
        //  isPressed: N/A.

        'thumbrest'
      ],
      primary: 'trigger'
    },
    'Oculus Touch (Left)': {
      style: 'oculus',
      axes: [{ name: 'thumbstick', indexes: [0, 1] }],
      buttons: [

        'thumbstick',
        'trigger',
        'grip',
        'X', 'Y',
        'thumbrest'
      ],
      primary: 'trigger'
    },
    'Oculus Go Controller': {
      style: 'oculus',


      //  THUMBPAD
      //  Oculus Go’s thumbpad has axes values and is also a button.
      //  The Y-axis is “Regular”.
      //
      //              Top: Y = -1
      //                   ↑
      //    Left: X = -1 ←─┼─→ Right: X = +1
      //                   ↓
      //           Bottom: Y = +1

      axes: [{ name: 'thumbpad', indexes: [0, 1] }],
      buttons: [


        //  THUMBPAD
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbpad',


        //  TRIGGER
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'trigger'
      ],
      primary: 'trigger'
    },
    ///////////////////
    //               //
    //   Microsoft   //
    //               //
    ///////////////////
    //  This is the first Gamepad ID setup we’ve come across that forced us
    //  to loop through the supported object’s keys and compare values using
    //  startsWith(), instead of just accessing directly like so:
    //  supported = THREE.VRController.supported[ gamepad.id ].
    //  You can read all the details about the unqiue identifier suffix here:
    //  https://github.com/stewdio/THREE.VRController/issues/8
    'Spatial Controller (Spatial Interaction Source)': {
      //  It’s hard to know what to call these controllers. They report as
      // “Spatial Controllers” but are branded as “Motion Controllers”
      //  and they’re for “Windows Mixed Reality” devices... 
      // “Microsoft Windows Mixed Reality Spatial Motion Controller”?
      //  Their team prefers “Windows motion controllers”. But for our style
      //  property string we want pith -- a single short word that makes it
      //  easy to distinguish from Oculus, Vive, etc. So we’ll go with 
      // “microsoft” as in “this is a controller in the style of Microsoft”.
      //
      //  NOTE: Currently Windows Mixed Reality devices only function in 
      //  Microsoft Edge on latest builds of Windows 10.

      style: 'microsoft',
      axes: [


        //  THUMBSTICK
        //  The thumbstick is super twitchy, seems to fire quite a bit on
        //  its own. Its Y-axis is “Regular”.
        //
        //              Top: Y = -1
        //                   ↑
        //    Left: X = -1 ←─┼─→ Right: X = +1
        //                   ↓
        //           Bottom: Y = +1

        { name: 'thumbstick', indexes: [0, 1] },


        //  THUMBPAD
        //  Operates exactly the same as the thumbstick but without the
        //  extra twitchiness.

        { name: 'thumbpad', indexes: [2, 3] }
      ],
      buttons: [


        //  THUMBSTICK
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'thumbstick',


        //  TRIGGER
        //  Its physical range of motion noticably exceeds the range of
        //  values reported. For example when engaging you can continue
        //  to squueze beyond when the value reports 1. And when 
        //  releasing you will reach value === 0 before the trigger is 
        //  completely released. The value property dictates touch and
        //  press states as follows:
        //
        //  Upon engaging
        //  if( value >= 0.00 && value < 0.10 ) NO VALUES REPORTED AT ALL!
        //  if( value >= 0.10 ) isTouched = true
        //  if( value >= 0.12 ) isPressed = true
        //
        //  Upon releasing
        //  if( value <  0.12 ) isPressed = false
        //  if( value == 0.00 ) isTouched = false
        //  --------------------------------------------------------------
        //  value:     Analog 0 to 1.
        //  isTouched: Simulated, corresponds to value.
        //  isPressed: Corresponds to value.

        'trigger',


        //  GRIP
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'grip',


        //  MENU
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: Duplicates isPressed.
        //  isPressed: As expected.

        'menu',


        //  THUMBPAD
        //  This is the only button that has actual touch detection.
        //  --------------------------------------------------------------
        //  value:     Binary 0 or 1, duplicates isPressed.
        //  isTouched: YES has real touch detection.
        //  isPressed: As expected.

        'thumbpad'
      ],
      primary: 'trigger'
    }
  };

  public AddedGamepadCallback: any = null;
  public RemovedGamepadCallback: any = null;

  public constructor(add: any, remove: any) {
    var that = this;
    Globals.logInfo("Setting up Input");
    this.AddedGamepadCallback = add;
    this.RemovedGamepadCallback = remove;
  }

  public update(): void {
    this.poll();

    for (let i: number = 0; i < this._gamepads.length; ++i) {
      let gp: VRGamepad = this._gamepads[i];
      if (gp != null) { // GP is set to null when gamepad is removed
        gp.update();
      }
    }
  }

  private poll(): void {
    try {
      if (!navigator.getGamepads) {
        if (this._initMsgs === false) {
          Globals.logError("VR setup Failed, no gamepads.");
        }
      }
      else {
        if (this._initMsgs === false) {
          Globals.logDebug("Found " + navigator.getGamepads().length + " gamepads.");
        }

        let pads: any = navigator.getGamepads();
        for (var n = 0; n < pads.length; ++n) {
          let gamepad: any = pads[n];

          if (gamepad && gamepad.pose) {
            if (gamepad.pose.orientation !== null || gamepad.pose.position !== null) {
              if (this._gamepads[n] === undefined) {
                this._gamepads[n] = new VRGamepad(this, gamepad);
                Globals.logDebug("Created VR gamepad");
                if (this.AddedGamepadCallback) {
                  this.AddedGamepadCallback(this._gamepads[n]);
                }
              }
              else {
                if (this._initMsgs === false) {
                  Globals.logError("Gamepad " + gamepad.id + " was not a valid VR gamepad.");
                }
              }
            }
          }
          else if (this._gamepads[n]) {
            //A gamepad was removed.
            if (this.RemovedGamepadCallback) {
              this.RemovedGamepadCallback(this._gamepads[n]);
            }
            this._gamepads[n].disconnect();
            this._gamepads[n] = null;
            Globals.logDebug("Removed gamepad.");
          }
          else {
            if (!gamepad) {
              //**Gamepad will be null at startup
              if (this._initMsgs == false) {
                Globals.logError("Gamepad was null.");
              }
            }
            else {
              Globals.logError("Gamepad " + gamepad.id + " was not a valid VR gamepad.");
            }
          }
        }
      }
      this._initMsgs = true;
    }
    catch (ex) {
      Globals.logError("Gamepad: " + ex)
    }
  }


}


export class VRGamepad extends THREE.Object3D {
  //#region Private Members
  private _errors: string = "";
  private _pos: THREE.Vector3;
  private _quaternion: THREE.Quaternion = new THREE.Quaternion();
  // private _matrix : THREE.Matrix4 = new THREE.Matrix4();
  private _gamepad: any = null;
  // private _axes : ReadonlyArray<number> = null;
  private _primaryButtonName: string = null;
  private _handedness: GamepadHand = null;
  private _buttons: Array<VRButton> = new Array<VRButton>();
  private _style: string = "";
  private _axes: Array<number> = new Array<number>();
  private _mgr: VRInputManager = null;
  //#endregion

  // public MoveController: any = null; // callback
  // public ButtonPress: any = null; // callback
  // public Joystick: any = null; //callback

  get buttons(): Array<VRButton> {
    return this._buttons;
  }
  get handedness(): GamepadHand {
    if (this._gamepad === null) {
      return null;
    }
    return this._gamepad.hand;
  }
  get x_axis(): number {
    if (this._gamepad === null) {
      return null;
    }
    //This is not standard.
    return this._gamepad.axes[0];//.byName['x'];
  }
  get y_axis(): number {
    if (this._gamepad === null) {
      return null;
    }
    //This is not standard.
    return this._gamepad.axes[1];//.byName['y'];
  }

  public constructor(mgr: VRInputManager, gamepad: Gamepad) {
    super();
    this._mgr = mgr;
    this._gamepad = gamepad;
    try {
      if (this.isSupported(gamepad) == false) {
        Globals.logError("Gamepad " + gamepad.id + " not supported.");
      }
      else {

        this.matrixAutoUpdate = false;

        this.update();
        //Update the controller every 60ms

      }
    } catch (ex) {
      Globals.logError('' + ex);
    }
  }

  public disconnect(): void {
  }

  private isSupported(gamepad: Gamepad): boolean {
    var key = Object.keys(VRInputManager.supported_controllers).find(function (id: string) {
      if (gamepad.id.startsWith(id)) {
        return true;
      }
      return false;
    });

    let supported: any = VRInputManager.supported_controllers[key];
    if (supported !== undefined) {
      this._style = supported.style;
      if (supported.buttons !== undefined) {
        let that: VRGamepad = this;

        supported.buttons.forEach(function (buttonName: string, i: number) {
          let v: VRButton = new VRButton();
          v.name = buttonName;
          v.primary = supported.buttons[i].isPrimary
          that._buttons.push(v);
        });
        this._primaryButtonName = supported.primary;

        return true;
      }
    }
    return false;
  }

  public update(): void {
    let pose: GamepadPose = this._gamepad.pose;

    if (pose.orientation !== null) {
      this.quaternion.fromArray(Array.prototype.slice.call(pose.orientation));
    }
    if (pose.position !== null) {

      this.position.fromArray(Array.prototype.slice.call(pose.position));
      this.matrix.compose(this.position, this.quaternion, this.scale);
    }
    else {
    }

    //Multiply the standing matrix by the controller matrix. 
    let stm: THREE.Matrix4 = Globals.getStandingMatrix();
    this.matrix.multiplyMatrices(stm, this.matrix)
    this.matrixWorldNeedsUpdate = true
    // if (this.MoveController) {
    //   this.MoveController();
    // }

    this.pollForChanges()
    this.applyVibes()
  }

  private pollForChanges(): void {
    var controllerInfo = '> #' + this._gamepad.index + ' ' + this._gamepad.id + ' (Handedness: ' + this._gamepad.handedness + ') ';

    //  Did the handedness change?
    if (this._handedness !== this._gamepad.hand) {
      if (this._mgr.Verbose) {
        Globals.logDebug(controllerInfo + 'hand changed from "' + this._handedness + '" to "' + this._gamepad.hand + '"')
      }

      this._handedness = this._gamepad.hand;
    }

    let that: VRGamepad = this;

    var axesChanged = false;
    this._gamepad.axes.forEach(function (axis: number, i: number) {
      if (axis !== that._axes[i]) {
        axesChanged = true
        that._axes[i] = axis;
      }
    })

    if (axesChanged) {
      if (this._mgr.Verbose) {
        Globals.logDebug(controllerInfo + 'axes changed ' + JSON.stringify(this._axes));
      }
      // if (this.Joystick) {
      //   this.Joystick();
      // }
    }

    for (let i = 0; i < this._buttons.length; ++i) {
      let button: VRButton = this._buttons[i];
      var controllerAndButtonInfo = controllerInfo + button.name + ' ';
      let bt: GamepadButton = this._gamepad.buttons[i];

      if (bt) {
        if (button.value !== bt.value) {
          button.value = bt.value;
          if (this._mgr.Verbose) {
            Globals.logDebug(controllerAndButtonInfo + 'value changed ' + button.value);
          }

          //dispatchEvent({ type: button.name + ' value changed', value: button.value })
          //if (isPrimary) controller.dispatchEvent({ type: 'primary value changed', value: button.value })
        }

        if (button.touched !== bt.touched) {
          button.touched = bt.touched;
          if (this._mgr.Verbose) {
            var eventAction = button.touched ? 'began' : 'ended';
            Globals.logDebug(controllerAndButtonInfo + 'touch ' + eventAction);
          }
          //  controller.dispatchEvent({ type: button.name + ' touch ' + eventAction })
          //  if (isPrimary) controller.dispatchEvent({ type: 'primary touch ' + eventAction })
        }

        if (button.pressed !== bt.pressed) {
          button.pressed = bt.pressed;
          if (this._mgr.Verbose) {
            var eventAction = button.pressed ? 'began' : 'ended';
            Globals.logDebug(controllerAndButtonInfo + 'press ' + eventAction);
          }

          // controller.dispatchEvent({ type: button.name + ' press ' + eventAction })
          // if (isPrimary) controller.dispatchEvent({ type: 'primary press ' + eventAction })
        }
      }

    }




  }

  private renderVibes(): void {
    //  First we need to clear away any past-due commands,
    //  and update the current intensity value.

    // const 
    // now = window.performance.now(),
    // controller = this

    // controller.vibeChannels.forEach( function( channel ){

    //   while( channel.length && now > channel[ 0 ][ 0 ]){

    //     channel.intensity = channel[ 0 ][ 1 ]
    //     channel.shift()
    //   }
    //   if( typeof channel.intensity !== 'number' ) channel.intensity = 0
    // })


    // //  Now each channel knows its current intensity so we can sum those values.

    // const sum = Math.min( 1, Math.max( 0, 

    //   this.vibeChannels.reduce( function( sum, channel ){

    //     return sum + +channel.intensity

    //   }, 0 )
    // ))
    // this.vibeChannels.intensity = sum
    // return sum
  }

  private applyVibes(): void {

    //if (this._gamepad.hapticActuators &&
    // this._gamepad.hapticActuators[ 0 ]){

    // const
    // renderedIntensity = this.renderVibes(),
    // now = window.performance.now()

    // if( renderedIntensity !== this.vibeChannels.prior ||
    //   now - this.vibeChannels.lastCommanded > THREE.VRController.VIBE_TIME_MAX / 2 ){

    //   this.vibeChannels.lastCommanded = now
    //   this._gamepad.hapticActuators[ 0 ].pulse( renderedIntensity, THREE.VRController.VIBE_TIME_MAX )
    //   this.vibeChannels.prior = renderedIntensity
    // }
    //}
  }

  //#endregion

}


