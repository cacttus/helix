import * as $ from "jquery";
import * as THREE from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL.js';
import { WEBVR } from 'three/examples/jsm/vr/WebVR.js';
import {
  Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc, MeshStandardMaterial,
  MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, ParametricBufferGeometry
} from 'three';
import * as Stats from 'stats.js';

//For SSAA thing.
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';

import { Console3D } from './Console3D';
import { PhysicsObject3D, PhysicsManager3D } from './Physics3D';
import { Screen2D, AudioManager, ModelManager, Input, Frustum } from './Base';
import { Prof } from "./Prof";

export enum GameState { Title, Play, GameOver }
enum WebGLVersion { WebGL1, WebGL2 }
export enum ResizeMode {
  Fixed, // Fixed canvas size.
  FillAndCenter, //Stretch the canvas across the window keeping the height aspect ratio, then center the canvas
  FitAndCenter, //Fit the viewport within the window's width/height and maintain the supplied aspect ratio
  Fullscreen // stretch the canvas across the window.
}
export interface GetVRDisplaysCallback { (): void }
export class _Globals {
  private _gamestate: GameState = GameState.Title;
  private _debug: boolean = false;
  private _isprof: boolean = false;
  private _showConsole: boolean = false;
  private _console3d: Console3D = null;
  private _frame: number = 0;
  private _ssaa: number = 0;
  private _camera: THREE.PerspectiveCamera = null;
  private _player: PhysicsObject3D = null;
  private _userGroup: THREE.Group;
  private _audio: AudioManager = null;
  private _models: ModelManager = null;
  private _screen: Screen2D = null;
  private _input: Input = null;
  private _scene: Scene = null;
  private _physics3d: PhysicsManager3D = null;
  private _prof: Prof = null;
  private _webGLVersion = WebGLVersion.WebGL1;
  private _renderer: THREE.WebGLRenderer = null;
  private _composer: EffectComposer = null;
  private _ssaaRenderpass: SSAARenderPass = null;
  private _copyPass: ShaderPass = null;
  private _canvas: HTMLCanvasElement = null;
  private _statsFps: Stats = null;
  private _statsMb: Stats = null;
  private _renderWidth: number = 1024;
  private _renderHeight: number = 768;
  private _resizeMode: ResizeMode = ResizeMode.Fullscreen;
  private _barColor: Color = new Color(0, 0, 0); // Color of the bars when in ResizeMode.Fit mode.
  private _frustum:Frustum = null;

  public isNotNullorUndefined(x: any) {
    return (x !== null) && (x !== undefined);
  }

  public init(canvasWidth: number, canvasHeight: number, resize: ResizeMode, barColor: Color = new Color(0, 0, 0)) {
    this._canvas = document.querySelector('#page_canvas');

    this._renderWidth = canvasWidth;
    this._renderHeight = canvasHeight;
    this._resizeMode = resize;
    this._barColor = barColor;
    

    this._screen = new Screen2D(this._canvas);
    this.createCamera();

    if (this._showConsole) {
      let console3d: Console3D = new Console3D();
      this._console3d = console3d;
      this._userGroup.add(console3d);
    }

    this.createRenderSystem();
    this.createScene();
    this.createSSAA();//Must be called after scene created

    this._audio = new AudioManager();
    this._models = new ModelManager();
    //this._particles = new Particles();
    this._input = new Input();
    this._physics3d = new PhysicsManager3D();
    this._prof = new Prof();

    if (this._isprof) {
      this._statsFps = new Stats();
      this._statsFps.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      this._statsFps.dom.style.cssText = 'position:absolute;top:0px;left:0px;';
      document.body.appendChild(this._statsFps.dom);

      this._statsMb = new Stats();
      this._statsMb.showPanel(2); // 0: fps, 1: ms, 2: mb, 3+: custom
      this._statsMb.dom.style.cssText = 'position:absolute;top:0px;left:80px;';
      document.body.appendChild(this._statsMb.dom);

    }

    this.createPlayer();
  }
  public get frustum() : Frustum { return this._frustum; }

  public get canvas(): HTMLCanvasElement { return this._canvas; }
  public get scene(): Scene { return this._scene; }
  public set scene(s: THREE.Scene) { this._scene = s; }
  public get player(): PhysicsObject3D { return this._player; }
  public get gameState(): GameState { return this._gamestate; }
  public set gameState(g: GameState) { this._gamestate = g; }
  public get physics3d(): PhysicsManager3D { return this._physics3d; }
  public get audio(): AudioManager { return this._audio; }
  public get models(): ModelManager { return this._models; }
  public get screen(): Screen2D { return this._screen; }
  public get input(): Input { return this._input; }
  public get renderer(): THREE.WebGLRenderer { return this._renderer; }
  public get camera(): PerspectiveCamera { return this._camera; }
  public get userGroup(): THREE.Group { return this._userGroup; }
  public get prof(): Prof { return this._prof; }

  public vrDeviceIsPresenting(): boolean {
    //You can't resize if the vr device is presenting.
    let d = this._renderer.vr.getDevice();
    let b: boolean = this._renderer.vr && d && d.isPresenting;
    if (b === null) {
      b = false;
    }
    return b;
  }
  private _vrSetupComplete: boolean = false;
  public userIsInVR(): boolean {
    if (!this._vrSetupComplete) {
      Globals.logError("Tried to query VR state before running the VR Setup algorithm.")
    }
    //Only call this after we have checked for VR
    return (this.VRSupported() && this._renderer.vr.enabled);
  }
  public VRSupported(): boolean {
    //This block copied directly from the WEBVR.js createbutton
    //The commented out portion is due to TypeScript not compiling a Never property
    return ('xr' in navigator /*&& 'supportsSession' in navigator.xr*/) ||
      ('getVRDisplays' in navigator);
  }
  public getSSAA(): number {
    if (this.userIsInVR()) {
      //The oculus messes up with SSAA turned on.  For some reason.
      return 0;
    }
    return this._ssaa;
  }
  public setRenderer(x: THREE.WebGLRenderer): void {
    this._renderer = x;
  }
  public setFlags(document_location: Location) {
    //Check that vr flag is enabled.
    const url_params = (new URL("" + document.location)).searchParams;
    this._debug = url_params.get('debug') === 'true';
    this._showConsole = url_params.get('console') === 'true';
    this._isprof = url_params.get('prof') === 'true';
    if (url_params.has('ssaa')) {
      this._ssaa = parseInt(url_params.get('ssaa'));
      if (this._ssaa < 0) this._ssaa = 0;
      if (this._ssaa > 32) this._ssaa = 32;
    }
  }

  public getTimeMillis(): number {
    let millis: number = new Date().getTime();
    return millis;
  }
  public getFrameNumber(): number {
    return this._frame;
  }
  public logInfo(e: any): void {
    let str: string = ">>I:" + e;
    console.info(e);

    if (this._console3d) {
      this._console3d.log(str);
    }
  }
  public logError(e: any): string {
    let str: string = ">>E:" + e;
    console.error(str);

    let stack: string = '' + new Error().stack;

    if (this._console3d) {
      this._console3d.log(str);
    }

    if(Globals.isDebug()){
     // Globals.debugBreak();
    }

    return str;
  }
  public logWarn(e: any): void {
    let str: string = ">>W:" + e;
    console.warn(str);

    if (this._console3d) {
      this._console3d.log(str);
    }
  }
  public logDebug(e: any): void {
    let str: string = ">>D:" + e;
    console.debug(str);

    if (this._console3d) {
      this._console3d.log(str);
    }
  }
  public isPowerOf2(value: number) {
    return (value & (value - 1)) == 0;
  }
  public getStandingMatrix(): THREE.Matrix4 {
    let m: THREE.Matrix4 = new THREE.Matrix4();
    m.identity();
    return m;
  }
  public isDebug(): boolean {
    return this._debug;
  }
  public isProf(): boolean {
    return this._isprof;
  }

  public startGameEngine(gameCore: any) {
    let last_time: number = 0;
    let that = this;

    this.renderer.setAnimationLoop(function (time: number) {

      that.prof.frameStart();
      {
        time *= 0.001;//convert to seconds I think
        let delta: number = time - last_time;
        last_time = time;
        
     //   that.frustum.construct();//Constructed when we actually update camera.

        Globals.prof.begin('update globals');
        {
          if (that._console3d) {
            Globals.prof.begin('update console');
            that._console3d.update(that.camera, that.userGroup);
            Globals.prof.end('update console');
          }

          if (that.input) {
            Globals.prof.begin('update input');
            that.input.update(delta);
            Globals.prof.end('update input');
          }

          if (that.physics3d) {
            Globals.prof.begin('update physics3');
            that.physics3d.update(delta);
            Globals.prof.end('update physics3');
          }
        }
        Globals.prof.end('update globals');

        Globals.prof.begin('game core');
        {
          gameCore(delta);
        }
        Globals.prof.end('game core');

        Globals.prof.begin("render");
        {
          that.render();
        }
        Globals.prof.end("render");

        Globals.audio._listener.position.copy(Globals.player.WorldPosition);

        //Reset mouse wheel.
        that.input.postUpdate();

        if (that._statsFps) {
          that._statsFps.update();
        }
        if (that._statsMb) {
          that._statsMb.update();
        }
      }

      that.prof.frameEnd();

      that._frame++;
    });
  }
  public render() {
    if (Globals.getSSAA() == 0) {
      this._renderer.render(Globals.scene, Globals.camera);
    }
    else {
      this._composer.render();
    }
  }
  public debugBreak() {
    debugger;
  }


  private createPlayer() {
    this._player = new PhysicsObject3D();
    this._player.add(this._userGroup);
    this._player.up = new Vector3(0, 1, 0);
    this._player.position.set(0, 0, 0);

    this._player.DestroyCheck = function (ob: PhysicsObject3D): boolean { return false; /*do not destroy player */ }
    this._player.rotateY(0);
  }


  private udpateRenderSize() {
    //if in VR, the "presenting" will cause an error if you try to do this.
    if (Globals.vrDeviceIsPresenting() === false) {
      if (this._renderer) {
        //WebGL1 does not support non pow2 textures.
        if (this._webGLVersion === WebGLVersion.WebGL2) {
          //https://stackoverflow.com/questions/19827030/renderer-setsize-calculation-by-percent-of-screen-three-js
          let canvas = this._renderer.domElement;
          let pixelRatio = window.devicePixelRatio;
          let height = this._renderHeight * pixelRatio | 0;; //canvas.clientWidth * pixelRatio | 0;
          let width = this._renderWidth * pixelRatio | 0;; //canvas.clientHeight * pixelRatio | 0;
          let needResize = (canvas.width !== width) || (canvas.height !== height);

          if (needResize) {
            this._renderer.setSize(width, height, false);
          }

          if (needResize) {
            Globals.camera.aspect = this._renderHeight / this._renderWidth; //canvas.clientWidth / canvas.clientHeight;
            Globals.camera.updateProjectionMatrix();
          }
          //Set the actual cnavas size.
          //This should cause the resize method to fire.

          if (this._resizeMode === ResizeMode.Fullscreen) {
            //Fullscreen, do not maintain aspect ratio
            $("#page_canvas").width(window.innerWidth);
            $("#page_canvas").height(window.innerHeight);
          }
          else if (this._resizeMode === ResizeMode.FillAndCenter) {
            //Fill the window, but maintain aspect ratio
            $("#page_canvas").width(window.innerWidth);
            let ch = window.innerWidth * (height / width);
            $("#page_canvas").height(ch);
            $("#page_canvas").css('position', 'absolute');
            $("#page_canvas").css('left', '0');
            let t = (window.innerHeight - ch > 0) ? ((window.innerHeight - ch) / 2) : -(ch - window.innerHeight) / 2;
            $("#page_canvas").css('top', t);

          }
          else if (this._resizeMode === ResizeMode.FitAndCenter) {
            //Fit the canvas.
            if (window.innerWidth >= window.innerHeight) {

              $("#page_canvas").height(window.innerHeight);
              let cv = window.innerHeight * (width / height);
              $("#page_canvas").width(cv);
              $("#page_canvas").css('position', 'absolute');
              $("#page_canvas").css('top', '0');
              let t = (window.innerWidth - cv > 0) ? ((window.innerWidth - cv) / 2) : -(cv - window.innerWidth) / 2;
              $("#page_canvas").css('left', t);
            }
            else {
              $("#page_canvas").width(window.innerWidth);
              let cv = window.innerWidth * (height / width);
              $("#page_canvas").height(cv);
              $("#page_canvas").css('position', 'absolute');
              $("#page_canvas").css('left', '0');
              let t = (window.innerHeight - cv > 0) ? ((window.innerHeight - cv) / 2) : -(cv - window.innerHeight) / 2;
              $("#page_canvas").css('top', t);
            }

            $('body').css('background-color', "#" + this._barColor.getHexString())

          }
          else {
            //fixed w/h
            $("#page_canvas").width(width);
            $("#page_canvas").height(height);
          }


        }
      }

    }
  }
  private getCookie(name: string): any {
    if (document.cookie) {
      var value = "; " + document.cookie;
      var parts = value.split("; " + name + "=");
      if (parts.length == 2) {
        return parts.pop().split(";").shift();
      }
    }
    return null;
  }
  private getBrowserMessage() {
    //https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
    // Internet Explorer 6-11
    // @ts-ignore
    var isIE = /*@cc_on!@*/false || !!document.documentMode;
    // Edge 20+
    // @ts-ignore
    var isEdge = !isIE && !!window.StyleMedia;
    if (isIE || isEdge) {
      return "For the best experience, try using a <a href='https://www.google.com/chrome' target='_blank'>Chrome</a> or <a href='https://www.mozilla.org/en-US/firefox/' target='_blank'>Firefox</a> web browser.";
    }

    // Opera 8.0+
    // @ts-ignore
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Firefox 1.0+
    // @ts-ignore
    var isFirefox = typeof InstallTrigger !== 'undefined';
    // Safari 3.0+ "[object HTMLElementConstructor]" 
    // @ts-ignore
    var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));

    // Chrome 1 - 71
    // @ts-ignore
    var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    // Blink engine detection
    // @ts-ignore
    var isBlink = (isChrome || isOpera) && !!window.CSS;
    if (!isChrome && !isFirefox) {
      return "Please note Helix is currently tested on Oculus VR, <a href='https://www.google.com/chrome'>Google Chrome</a>, <a href='https://www.mozilla.org/en-US/firefox/'>Firefox</a> and Edge.  Other browsers and VR systems may not work."
    }
    return "";
  }
  private checkBrowser() {
    let showWarningCookie: string = "shownBrowserWarning";
    let shown: boolean = this.getCookie(showWarningCookie) as boolean;
    if (shown === null || shown === false) {
      let msg = this.getBrowserMessage();

      if (msg && msg.length) {
        $('body').prepend(' <div class="browser_warning_container">' +
          '<div class="bwc_cont" style="padding-bottom:0.4em"></div>' +
          '<div style="text-align:center;">' +
          '<div class="browser_warning_container_ok">Ok</div>' +
          '</div>' +
          '</div>');
        let bw = $('.browser_warning_container');
        bw.hide();

        let bwc = $('.bwc_cont');
        bwc.append(msg);

        bw.css('position', 'absolute');
        let middle = Math.max((window.innerWidth - bw.width()) * 0.5, 0);
        bw.css('left', middle);
        bw.css('top', 0);

        bw.fadeToggle(600); //show smoothly
        $('.browser_warning_container_ok').click((e) => {
          function hideIt() {
            let bw = $('.browser_warning_container');
            document.cookie = showWarningCookie + "=true";
            if (bw.is(':visible')) {
              bw.fadeToggle(200);
            }
          }
          hideIt();
          //center it
          window.addEventListener('resize', function () {
            let middle = Math.max((window.innerWidth - bw.width()) * 0.5, 0);
            bw.css('left', middle);
            bw.css('top', 0);
          }, false);
          //remove after 10s
          window.setTimeout(() => {
            hideIt();
          }, 10000);

        });
      }
    }
  }
  private createRenderSystem() {
    let that = this;

    //Make sure the window can resize.
    window.addEventListener('resize', function () {
      that.udpateRenderSize();
    }, false);

    this.createWebGL2Context();

    //Force an update to the renderer size.
    this.udpateRenderSize();
  }
  private createWebGL2Context() {
    //So, THREE has less capabilities if it's not using webgl2
    //we must use webgl2 to prevent erroneous texture resizing (pow2 only textures)
    //@ts-ignore:
    let webgl2_available: boolean = !!(window.WebGL2RenderingContext && this.canvas.getContext('webgl2'));

    if (webgl2_available === false) {
      Globals.logWarn(WEBGL.getWebGL2ErrorMessage());
      this._renderer = new THREE.WebGLRenderer({ canvas: this.canvas });//You can pass canvas in here
      this._webGLVersion = WebGLVersion.WebGL1;
    }
    else {
      let context: WebGL2RenderingContext = this.canvas.getContext('webgl2', { alpha: false });

      //@ts-ignore:
      this._renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context: context });
      this._webGLVersion = WebGLVersion.WebGL2;
    }

    Globals.logInfo("***Created WebGL version '" + this._webGLVersion + "' context.***")
    this._renderer.setClearColor(0xffffff, 1);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    this.setupVRorDesktopMode()
  }
  private setupVRorDesktopMode() {
    const setupVROrDesktopCallback = (value: VRDisplay[]) => {
      //Check for VR
      if (value && value.length > 0) {
        Globals.logInfo("WebVR: VR is supported and enabled.  Starting in VR mode.")
        this._renderer.vr.enabled = true;
        document.body.appendChild(WEBVR.createButton(this._renderer, { referenceSpaceType: 'local' }));
      }
      else {
        Globals.logInfo("WebVR: VR is not supported or enabled.  Starting in Desktop mode.")
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this._renderer.domElement);
      }

      //Set the final renderer
      Globals.setRenderer(this._renderer);

      //Check Browser
      window.setTimeout(() => {
        try {
          this.checkBrowser();
        }
        catch (ex) {
          Globals.logError("Non-critical error during browser checking: " + ex ? ex : '');
        }
      }, 3000);

      //Done
      this._vrSetupComplete = true;
    }
    if ('getVRDisplays' in navigator) {
      //we have the method, need to check fo rdisplays async
      navigator.getVRDisplays().then((value: VRDisplay[]) => {
        setupVROrDesktopCallback(value);
      });
    }
    else {
      setupVROrDesktopCallback([]);
    }

  }

  private createSSAA() {
    if (this.getSSAA() > 0) {
      this._composer = new EffectComposer(this._renderer);
      this._ssaaRenderpass = new SSAARenderPass(this.scene, this.camera, new THREE.Color(0, 0, 0), 0);
      this._ssaaRenderpass.unbiased = false;
      this._ssaaRenderpass.sampleLevel = this.getSSAA();
      this._composer.addPass(this._ssaaRenderpass);
      this._copyPass = new ShaderPass(CopyShader);
      this._composer.addPass(this._copyPass);
    }
  }
  private createCamera() {
    //  const canvas: HTMLCanvasElement = document.querySelector('#page_canvas');
    this._camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);

    this._frustum = new Frustum();

    //https://stackoverflow.com/questions/49471653/in-three-js-while-using-webvr-how-do-i-move-the-camera-position
    //In VR we actually add the camera to a group since user actually moves the camera(s) reltaive to origin
    this._userGroup = new THREE.Group()
    this._userGroup.add(this._camera);
    this._userGroup.position.set(0, 0.02, -0.12);
    this._userGroup.rotateY(0);
  }
  private createScene() {
    let szGrid = 'dat/img/grd.png';

    let bk = szGrid;

    // let side = 'dat/img/side_cube-128.png';
    // let top = 'dat/img/top_cube-128.png';
    // let bot = 'dat/img/bot_cube-128.png';

    let side ='dat/img/black-128.png';
    let top ='dat/img/black-128.png' ;
    let bot = 'dat/img/black-128.png';

    this.scene = new THREE.Scene();
    {
      const loader: THREE.CubeTextureLoader = new THREE.CubeTextureLoader();
      const texture: THREE.CubeTexture = loader.load([
        side, side, top, bot, side, side,
      ]);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      this.scene.background = texture;
    }
  }








}

//https://stackoverflow.com/questions/42540745/typescript-how-to-export-a-variable
const Globals = new _Globals();
export { Globals };




