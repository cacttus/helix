import * as THREE from 'three';
import { Globals } from './Globals';
import { LineBasicMaterial, Vector3 } from 'three';
//import * as Main from './Main';
import { Frustum } from './Base';

export class TextCanvasOptions {
  public Fontsize: number = 50;
  public Lineheight: number = 50;
  public Text: string = "Hi World.";
  public Width: number = 384;
  public Height: number = 192;
  public AutoHeight: boolean = true; //Ignore height, Automatically adjust height to be 384/192 x width
  public opacity: number = 1;
}
//Implementatio of : https://vr.with.in/archive/text-2d-canvas/
export class TextCanvas extends THREE.Object3D {
  private _options: TextCanvasOptions = null;
  private _texture: THREE.Texture = null;
  private _plane: THREE.Mesh = null;
  private _hitBoxes: Array<THREE.Mesh> = new Array<THREE.Mesh>();
  private _lines: THREE.LineSegments = null;
  private _renderingContext: CanvasRenderingContext2D = null;

  public AlignToScreen = false;
  public ScreenX = 0;
  public ScreenY = 0;
  public ScreenZ = 2;
  public Newlines: boolean = true; //whether we process \n on separate line

  public Text: string = "Hello World.";
  public showWireframe(show: boolean) {
    this._lines.visible = show;
  }
  public getWidth(): number {
    return this._options.Width;
  }
  public getHeight(): number {
    return this._options.Height;
  }
  public constructor(options: TextCanvasOptions) {
    super();

    this._options = options;
    this.Text = options.Text;
    this.createTexture();
  }
  public update(camera: THREE.PerspectiveCamera, u: THREE.Group): void {
    this.updateTexture();
    if (this.AlignToScreen && camera && u) {
      this.alignToScreen(camera, u);
    }
  }
  private bitCount(n: number): number {
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
  }
  private createTexture(): void {
    //This is a common way fo faking 3D text from a canvas.
    //384 x 192 was the original that this had.
    let default_ratio: number = 192 / 384;
    let w: number = this._options.Width;
    let h: number = this._options.AutoHeight ? this._options.Width * default_ratio : this._options.Height;// * ratio;

    let ratio = w / h;

    var canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = canvas.width / ratio; // make sure the canvas is the same size ratio as the geometry

    this._renderingContext = canvas.getContext('2d');
    this._texture = new THREE.Texture(canvas);
    this._texture.needsUpdate = true;

    //Texture kept resizing.
    //https://stackoverflow.com/questions/55175351/remove-texture-has-been-resized-console-logs-in-three-js
    //https://github.com/mrdoob/three.js/issues/13126
    //The problem with this is that in order to use mipmaps you need a pow2 texture.
    this._texture.generateMipmaps = false;
    this._texture.wrapS = this._texture.wrapT = THREE.ClampToEdgeWrapping;
    this._texture.minFilter = THREE.LinearFilter;//MipmapLinearFilter;
    this._texture.magFilter = THREE.LinearFilter;
    // this._texture.magFilter = THREE.LinearFilter;

    var planeMat = new THREE.MeshBasicMaterial({
      map: this._texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false // Disable depth testing so we can do s
    });


    var planeGeo = new THREE.PlaneBufferGeometry(w, h);
    planeGeo.computeBoundingBox(); // for hit area

    this._plane = new THREE.Mesh(planeGeo, planeMat);

    //**Move the origin to the top left corner.
    this._plane.position.x += this._options.Width * 0.5;
    this._plane.position.y -= this._options.Height * 0.5;

    this.update(null, null);

    //Hitbox
    var boxMat = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0
    });
    var hitBox = new THREE.Mesh(planeGeo, boxMat);

    this._plane.add(hitBox);
    this._hitBoxes.push(hitBox);

    //Wireframe
    var wireframe = new THREE.WireframeGeometry(planeGeo);
    this._lines = new THREE.LineSegments(wireframe);
    (this._lines.material as LineBasicMaterial).color.setHex(0xaaaaaa);
    this._plane.add(this._lines);

    this.add(this._plane);
  }
  private _lastText: string = "";

  private updateTexture(): void {
    if (this._lastText === this.Text) {
      return;
    }
    this._lastText = this.Text;

    //var string = this.string = str || this.string;
    var ctx = this._renderingContext;
    var canvas = ctx.canvas;

    ctx.font = '800 ' + this._options.Fontsize + 'px Arial';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var maxWidth = canvas.width;
    var x = (canvas.width - maxWidth) / 2; // left aligned
    var y = this._options.Fontsize; // start at the top

    var words = this.Text.split(' ');
    var line = '';

    //TODO: individually colored text blocks.
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = this._options.opacity;

    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + ' ';
      var metrics = ctx.measureText(testLine);
      var testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        //we went over bounds, new line
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += this._options.Lineheight;
      }
      else if (this.Newlines && words[n].includes('\n')) {
        //we have newlines, append, then newline
        var sw = words[n].split('\n');
        if (sw.length > 0) {
          for (var iw = 0; iw < sw.length - 1; ++iw) {
            testLine = line + sw[iw] + ' ';
            ctx.fillText(testLine, x, y);
            line = '';
            y += this._options.Lineheight;
          }
          line = sw[sw.length - 1] + ' ';
        }
      }
      else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);

    (this._plane.material as THREE.MeshBasicMaterial).map.needsUpdate = true;
  }

  private alignToScreen(camera: THREE.PerspectiveCamera, user: THREE.Group): void {
    //This method needs a serious overhaul.
    //Move the object to the screen
    let cn: Vector3 = new Vector3();
    camera.getWorldDirection(cn);
    let cp: Vector3 = new Vector3();
    camera.getWorldPosition(cp);

    let f: Frustum = new Frustum(cn, cp);
    let dist: number = camera.near;  // our camera has a near plane of 1 unit

    //This is kind of dumb
    let push: number = Globals.userIsInVR() ? 2.0 : 0.2; // the amount we 'push' the UI into the screen so it isn't intersecting cam near plane

    let cam_dir: THREE.Vector3 = new THREE.Vector3();
    camera.getWorldDirection(cam_dir);
    let up: THREE.Vector3 = camera.up.clone();
    let left: THREE.Vector3 = up.clone().cross(cam_dir);
    //https://stackoverflow.com/questions/13350875/three-js-width-of-view
    var vFOV = THREE.Math.degToRad(camera.fov); // convert vertical fov to radians
    var height = 2 * Math.tan(vFOV / 2) * dist; // visible height
    var width = height * camera.aspect;
    let center: THREE.Vector3 = user.position.clone().add(cam_dir.clone().multiplyScalar(dist + push));
    let topleft: THREE.Vector3 = center.clone().add(up.clone().multiplyScalar(height * 0.5)).add(left.clone().multiplyScalar(width * 0.5));

    //"Push" into the screen, but stay on the correct viewport boundary
    // topleft.add(topleft.clone().sub(camera.position.clone()).normalize().multiplyScalar(push));

    //console.log('' + camera.fov + ' ' + '' + height + ' ' + width + ' ' + '' + topleft.x + ' ' + topleft.y + ' ' + topleft.z);
    let pos: THREE.Vector3 = new THREE.Vector3(topleft.x, topleft.y, topleft.z);
    pos.add(left.clone().negate().multiplyScalar(width * this.ScreenX)).add(up.clone().negate().multiplyScalar(height * this.ScreenY));

    this.position.set(pos.x, pos.y, pos.z);

    //We may actually be able to do this without sticking these ont eh screen.
    //Set the rotation equal to camera
    this.rotation.x = camera.rotation.x;
    this.rotation.y = camera.rotation.y;
    this.rotation.z = camera.rotation.z;

  }
}