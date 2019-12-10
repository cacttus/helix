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
import { GlobalEventObject, GlobalEvent } from './Base';
import { Utils } from './Utils';

export class Color4 {
  public r: number;
  public g: number;
  public b: number;
  public a: number;
  public constructor(dr: number, dg: number, db: number, da: number) {
    this.r = dr; this.g = dg; this.b = db; this.a = da;
  }
  public equals(c: Color4): boolean {
    let b = (c.r === this.r) && (c.g === this.g) && (c.b === this.b) && (c.a === this.a);
    return b;
  }
}
export class Screen2D extends GlobalEventObject {
  private _canvas: HTMLCanvasElement = null;
  private _lastWidth = 0;
  private _lastHeight = 0;
  private _aspect = 0;
  get canvas(): HTMLCanvasElement { return this._canvas; }
  get pixelWidth(): number { return this._lastWidth; }
  get pixelHeight(): number { return this._lastHeight; }
  get aspect(): number { return this._aspect; }//aspect ratio
  get elementWidth(): number {
    let rect = this._canvas.getBoundingClientRect();
    return rect.width;
  }
  get elementHeight(): number {
    let rect = this._canvas.getBoundingClientRect();
    return rect.height;
  }
  public constructor(canvas: HTMLCanvasElement) {
    super();
    this._canvas = canvas;
    this.addNotification(GlobalEvent.EventScreenChanged);
  }
  //void blit.
  public sizeChanged() {
    if (this._lastWidth !== this.pixelWidth || this._lastHeight !== this.pixelHeight) {
      this._lastWidth = this._canvas.width;
      this._lastHeight = this._canvas.height;
      this._aspect = this._lastWidth / this._lastHeight;
      this.sendEvent(GlobalEvent.EventScreenChanged, null);
    }
  }
  //Return the relative XY of the mouse relative to the top left corner of the canvas.
  public getCanvasRelativeXY(clientX: number, clientY: number): vec2 {
    let v2: vec2 = new vec2();
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
  public project3D(clientX: number, clientY: number, distance: number): vec3 {
    let v2: vec2 = this.getCanvasRelativeXY(clientX, clientY);

    let mouse_pos = Globals.camera.Frustum.project(v2.x, v2.y, distance);
    return mouse_pos;
  }
}
export class PointGeo extends THREE.Object3D {
  public constructor() {
    super();
    let p0: vec3 = new vec3(0, 0, 0);
    let points_geo: THREE.Geometry = new THREE.Geometry();
    points_geo.vertices.push(p0);
    var pointMaterial = new THREE.PointsMaterial({ color: 0xFFFF00, size: 0.1 });
    let points: THREE.Points = new THREE.Points(points_geo, pointMaterial);
    this.add(points);
  }
}
/**
 * A viewing frustum for a camera.  Quick class to calculate point in screen.
 */
export class Frustum {
  private _ftl: vec3 = new vec3();
  private _ftr: vec3 = new vec3();
  private _fbl: vec3 = new vec3();
  private _fbr: vec3 = new vec3();
  private _ntl: vec3 = new vec3();
  private _ntr: vec3 = new vec3();
  private _nbl: vec3 = new vec3();
  private _nbr: vec3 = new vec3();

  private _right: vec3 = new vec3();
  private _down: vec3 = new vec3();
  private _up: vec3 = new vec3(); //This is a basis vector not 0,1,0
  private _normal: vec3 = new vec3();

  private _far_plane_width: number = 0;
  private _far_plane_height: number = 0;
  private _near_plane_width: number = 0;
  private _near_plane_height: number = 0;

  public get nearPlaneWidth(): number { return this._near_plane_width; }
  public get nearPlaneHeight(): number { return this._near_plane_height; }
  // public get farPlaneWidth() : number { return this._far_plane_width; }
  //// public get farPlaneHeight() : number { return this._far_plane_height; }

  public get ftl(): vec3 { return this._ftl; }//back topleft
  public get ftr(): vec3 { return this._ftr; }//back topright
  public get fbl(): vec3 { return this._fbl; }//back bottomleft
  public get fbr(): vec3 { return this._fbr; }//back bottomleft
  public get ntl(): vec3 { return this._ntl; }//near top left
  public get nbl(): vec3 { return this._nbl; }//near bot left
  public get nbr(): vec3 { return this._nbr; }//near bot left
  public get ntr(): vec3 { return this._ntr; }//near top right

  public get right(): vec3 { return this._right; }
  public get down(): vec3 { return this._down; }
  public get up(): vec3 { return this._up; }
  public get normal(): vec3 { return this._normal; }

  //private Points_fpt_ntl: vec3;//back bottomleft
  // public constructor(cam_dir: vec3 = null, cam_pos: vec3 = null) {
  //   this.construct(cam_dir, cam_pos);
  // }
  //Project a point onto the screen in 3D
  public projectScreen(screen_x: number, screen_y: number) {
    return this.project(screen_x, screen_y, Globals.camera.Near);
  }
  //Project a point into the screen/canvas, x and y are relative to the top left of the canvas (not the window)
  //A distance of 
  public project(screen_x: number, screen_y: number, dist: number): vec3 {

    //Limit projection bounds to the canvas.
    if (screen_x < 0) {
      screen_x = 0;
    }
    if (screen_x > Globals.screen.elementWidth) {
      screen_x = Globals.screen.elementWidth;
    }
    if (screen_y < 0) {
      screen_y = 0;
    }
    if (screen_y > Globals.screen.elementHeight) {
      screen_y = Globals.screen.elementHeight;
    }



    //Project onto screen.
    let wrx = screen_x / Globals.screen.elementWidth;
    let wry = screen_y / Globals.screen.elementHeight;

    let dx = this._ftr.clone().sub(this._ftl).multiplyScalar(wrx);
    let dy = this._fbl.clone().sub(this._ftl).multiplyScalar(wry);

    let back_plane: vec3 = this._ftl.clone().add(dx).add(dy);

    //Limit distance based on orthographic projection paramters of 0,1.
    if (dist > Globals.camera.Far - Globals.camera.Near) {
      dist = (Globals.camera.Far - Globals.camera.Near);
    }

    //Project Into world.
    let projected: vec3 = back_plane.clone().add(Globals.camera.CamDirBasis.clone().multiplyScalar(dist));

    return projected;
  }
  public construct(cam_pos: vec3 = null, cam_dir_basis: vec3 = null, cam_up_basis: vec3 = null, cam_right_basis: vec3 = null) {
    //this is not a correct basis vector.  this is the 'up' reference used to construct the projection matrix
    if (cam_up_basis === null) {
      cam_up_basis = Globals.camera.CamUpBasis.clone();//.normalize();
    }
    if (cam_dir_basis === null) {
      cam_dir_basis = Globals.camera.CamDirBasis.clone();
    }
    if (cam_right_basis === null) {
      cam_right_basis = Globals.camera.CamRightBasis.clone();
    }
    if (cam_pos === null) {
      cam_pos = Globals.camera.CamPos.clone();
    }

    let fc: vec3 = cam_pos.clone().add(cam_dir_basis.clone().multiplyScalar(Globals.camera.Far));
    let nc: vec3 = cam_pos.clone().add(cam_dir_basis.clone().multiplyScalar(Globals.camera.Near));

    if (Globals.camera.IsPerspective) {
      this.setupPerspective(fc, nc, cam_pos, cam_up_basis, cam_dir_basis, cam_right_basis);
    }
    else {
      this.setupOrthographic(fc, nc, cam_pos, cam_up_basis, cam_dir_basis, cam_right_basis);
    }

    //Construct the correct up basis vector

  }
  private setupPerspective(fc: vec3, nc: vec3, camPos: vec3, camUp: vec3, camView: vec3, camRight: vec3) {


    let ar = Globals.screen.elementHeight / Globals.screen.elementWidth;
    let fov = THREE.Math.degToRad(Globals.camera.PerspectiveCamera.getEffectiveFOV());//The FOV with zoom applied, we don't use zoom for perspective camera however.
    let tan_fov_2 = Math.tan(fov / 2.0);

    let w_far_2 = tan_fov_2 * Globals.camera.Far;
    let h_far_2 = w_far_2 * ar;
    let w_near_2 = tan_fov_2 * Globals.camera.Near;
    let h_near_2 = w_near_2 * ar;

    this.constructPointsAndPlanes(nc, fc,
      camPos, camUp, camView, camRight,
      w_near_2, w_far_2,
      h_near_2, h_far_2);

  }
  private setupOrthographic(fc: vec3, nc: vec3, camPos: vec3, camUp: vec3, camView: vec3, camRight: vec3) {

    // let nc = camPos.clone().add(camView.clone().multiplyScalar(znear));
    // let fc = camPos.clone().add(camView.clone().multiplyScalar(zfar));

    let ww = Math.abs((Globals.camera.OrthographicCamera.right - Globals.camera.OrthographicCamera.left) * 0.5);
    let hh = Math.abs((Globals.camera.OrthographicCamera.bottom - Globals.camera.OrthographicCamera.top) * 0.5);

    let vpWidth_2: number = ww;//_pViewportRef->getWidth() * 0.5f;
    let vpHeight_2: number = hh;//_pViewportRef->getHeight() * 0.5f;

    // Will this work?? IDK! ha
    this.constructPointsAndPlanes(nc, fc,
      camPos, camUp, camView, camRight,
      vpWidth_2, vpWidth_2,
      vpHeight_2, vpHeight_2);
  }
  private constructPointsAndPlanes(nearCenter: vec3, farCenter: vec3, pos: vec3, cam_up_basis: vec3, cam_dir_basis: vec3, cam_right_basis: vec3, w_near_2: number, w_far_2: number, h_near_2: number, h_far_2: number) {
    let cup_far = cam_up_basis.clone().multiplyScalar(h_far_2);
    let crt_far = cam_right_basis.clone().multiplyScalar(w_far_2);
    this._ftl = farCenter.clone().add(cup_far).sub(crt_far);
    this._ftr = farCenter.clone().add(cup_far).add(crt_far);
    this._fbl = farCenter.clone().sub(cup_far).sub(crt_far);
    this._fbr = farCenter.clone().sub(cup_far).add(crt_far);


    let cup_near = cam_up_basis.clone().multiplyScalar(h_near_2);
    let crt_near = cam_right_basis.clone().multiplyScalar(w_near_2);
    this._ntl = nearCenter.clone().add(cup_near).sub(crt_near);
    this._ntr = nearCenter.clone().add(cup_near).add(crt_near);
    this._nbl = nearCenter.clone().sub(cup_near).sub(crt_near);
    this._nbr = nearCenter.clone().sub(cup_near).add(crt_near);


    this._right = cam_right_basis.clone();
    this._up = cam_up_basis;
    this._down = cam_up_basis.clone().multiplyScalar(-1);
    this._normal = cam_dir_basis.clone();


    //this._far_plane_width = this.ntr
    //this._far_plane_height : number = 0;
    this._near_plane_width = this.ntr.clone().sub(this.ntl).length();
    this._near_plane_height = this.nbl.clone().sub(this.ntl).length();
  }
}

// //Creates a copy of another mesh's material in case we need to set custom material properties.
export class MaterialDuplicate {
  private _flashing: boolean = false;
  private _flash: number = 0;
  private _flashDir: number = 1;//-1, or 1
  private _saturation: number = 0;
  private _duration: number = 0;
  private _flashColor: THREE.Color = new THREE.Color(0, 0, 0);

  private _isUniqueMaterial: boolean = false;
  private _isUnqiueColor: boolean = false;
  private _ob_to_material: Map<THREE.Mesh, THREE.Material> = new Map<THREE.Mesh, THREE.Material>();
  private _flash_saved_material: Map<THREE.Mesh, THREE.Material> = new Map<THREE.Mesh, THREE.Material>();
  private _parent: THREE.Object3D = null;

  public constructor(parent: THREE.Object3D) {
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
  public set color(val: THREE.Color) {
    this.setColor(val, null);
  }
  public setColor(val: THREE.Color, meshName: string = null): boolean {
    //The way this works, if we ever change the material color, it permanently becomes a unique material.
    let that = this;
    let colorSet: boolean = false;
    that._parent.traverse(function (ob_child: any) {
      if (ob_child instanceof THREE.Mesh) {
        let m: THREE.Mesh = ob_child as THREE.Mesh;
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
  public flash(color: THREE.Color, durationInSeconds: number, saturation: number): void {
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

      that._flash_saved_material = new Map<THREE.Mesh, THREE.Material>();

      //Save emissive color for flash only.
      that._parent.traverse(function (ob_child: any) {
        if (ob_child instanceof THREE.Mesh) {
          let m: THREE.Mesh = ob_child as THREE.Mesh;
          that._flash_saved_material.set(m, m.material as THREE.Material);
          that.cloneMeshMaterial(m);
          //Blank out emissive so we get a full red.
          if (m.material && m.material instanceof THREE.MeshStandardMaterial) {
            m.material.emissive = new THREE.Color(0, 0, 0);
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
          let m: THREE.Material = this._ob_to_material.get(key);
          key.material = m;
        }
      }
      this._isUniqueMaterial = false;
    }
  }
  private cloneMeshMaterial(m: THREE.Mesh) {
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

      that._ob_to_material = new Map<THREE.Mesh, THREE.Material>();

      that._parent.traverse(function (ob_child: any) {
        if (ob_child instanceof THREE.Mesh) {

          let m: THREE.Mesh = ob_child as THREE.Mesh;

          that._ob_to_material.set(m, m.material as THREE.Material);

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
          let cc: THREE.Material = this._flash_saved_material.get(key);
          key.material = cc;
        }

        return;
      }

      let fpct: number = this._flash / (this._duration * .5) * this._saturation;

      //Lerp the flash material from the material we have saved.
      let that = this;
      for (let key of Array.from(this._flash_saved_material.keys())) {
        let mat: THREE.Material = this._flash_saved_material.get(key);

        if (mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshStandardMaterial) {
          let c: THREE.Color = mat.color;
          let c2: THREE.Color = Utils.lerpColor(c, that._flashColor, fpct);
          Utils.setMeshColor(key, c2);
        }

      }
    }


  }
}
