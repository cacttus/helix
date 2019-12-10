

import * as THREE from 'three';
import { GlobalEvent, GlobalEventObject } from './Base';
import { toInt, Int } from './Int';
import { Globals } from './Globals';
import { vec2, vec3, vec4, ivec2 } from './Math';
import { SpriteFrame, WorldView25D, DirtyFlag} from './Helix25D';

export class UILayout extends GlobalEventObject {
  private _widthPx: number = 128;
  private _heightPx: number = 128;

  public constructor(width_px: number, height_px: number) {
    super();
    this._widthPx = width_px;
    this._heightPx = height_px;
    Globals.screen.register(GlobalEvent.EventScreenChanged, this);
  }
  public project(pos_layout: vec2, wh_layout: vec2, out_box_r3: THREE.Box3, depth: number = 0.0002) {
    if (!out_box_r3) {
      out_box_r3 = new THREE.Box3();
    }

    let x1_ratio = pos_layout.x / this._widthPx;
    let y1_ratio = pos_layout.y / this._heightPx;
    let x2_ratio = (pos_layout.x + wh_layout.x) / this._widthPx;
    let y2_ratio = (pos_layout.y + wh_layout.y) / this._heightPx;

    let X1 = Globals.camera.Frustum.right.clone().multiplyScalar(x1_ratio * Globals.camera.Frustum.nearPlaneWidth);
    let Y1 = Globals.camera.Frustum.down.clone().multiplyScalar(y1_ratio * Globals.camera.Frustum.nearPlaneHeight);
    let X2 = Globals.camera.Frustum.right.clone().multiplyScalar(x2_ratio * Globals.camera.Frustum.nearPlaneWidth);
    let Y2 = Globals.camera.Frustum.down.clone().multiplyScalar(y2_ratio * Globals.camera.Frustum.nearPlaneHeight);

    out_box_r3.min = Globals.camera.Frustum.ntl.clone().add(X1.clone().add(Y1));
    out_box_r3.max = Globals.camera.Frustum.ntl.clone().add(X2.clone().add(Y2));
    out_box_r3.min.add(Globals.camera.Frustum.normal.clone().multiplyScalar(depth));
    out_box_r3.max.add(Globals.camera.Frustum.normal.clone().multiplyScalar(depth));

    //Swap y's for Top left to Bot left coords.
    // let tmp = out_box_r3.min.y;
    // out_box_r3.min.y = out_box_r3.max.y;
    // out_box_r3.max.y = tmp;
  }
  public receiveEvent(event: GlobalEvent) {
    if (event.Id === GlobalEvent.EventScreenChanged) {

    }
  }
}
export class UIElement {
  //A simple texture that we got from the tile map
  private _frame: SpriteFrame = null;
  public get Frame(): SpriteFrame { return this._frame; }
  public Verts: Array<vec3> = new Array<vec3>();
  public Depth: number = 0.01;
  private _ui: QuickUI = null;
  public Pos: vec2 = new vec2(0, 0); // In layout pixels.
  public Size: vec2 = new vec2(256, 256); // in layout pixels
  private _box: THREE.Box3 = new THREE.Box3();

  //For now we're just going to use textures
  public constructor(ui: QuickUI, spriteName: string) {
    this._ui = ui;
    let spr = this._ui.WorldView.MasterMap.MapData.Sprites.getSpriteByName("ui_title");
    this._frame = spr.getDefaultTileFrame();
    //let bounds: Box2f = spr.getTileBounds();
    //bounds.Min.x, bounds.Min.y, bounds.Width(), bounds.Height()));
    //frame_x: number, frame_y: number, frame_width: number, frame_height: number
    //this._frame = ui.WorldView.Atlas.getFrame(frame_x as Int, frame_y as Int, frame_width as Int, frame_height as Int);
  }
  public update(parent_depth: number) {
    let rot: THREE.Quaternion = new THREE.Quaternion(1, 1, 1, 1);
    let scale: vec2 = new vec2(1, 1);

    this._ui.Layout.project(this.Pos, this.Size, this._box);

    if (!Globals.camera.IsPerspective) {
      this._box.min.z = 0.0;
      this._box.max.z = 0.0;
    }

    let bw = Math.abs(this._box.max.x - this._box.min.x);//This essentially fixes the y=down problem for the ui in particular.
    let bh = Math.abs(this._box.max.y - this._box.min.y);

    SpriteFrame.createQuadVerts(this.Verts, this._box.min, rot, scale, bw, bh,
      Globals.camera.Frustum.right.clone(), Globals.camera.Frustum.down.clone(), Globals.camera.Frustum.normal.clone());
  }
}
export class QuickUI {
  private _elements: Array<UIElement> = new Array<UIElement>();
  public get Elements(): Array<UIElement> { return this._elements; }

  private _layout: UILayout = null;
  public get Layout(): UILayout { return this._layout; }

  public readonly c_base_ui_depth = 0.06;

  private _view: WorldView25D = null;
  public get WorldView(): WorldView25D { return this._view; }
  public constructor(view: WorldView25D) {
    this._view = view;
    this._layout = new UILayout(256, 256);
  }
  public update() {

    for (let elem of this._elements) {
      elem.update(this.c_base_ui_depth);
    }
  }
  public draw() {
    let normal: vec3 = new vec3(0, 0, 1);
    let color: vec4 = new vec4(1, 1, 1, 1);

    for (let elem of this._elements) {
      this._view.Buffer.copyFrameQuad(elem.Frame, elem.Verts, normal, color, 1, false, false, DirtyFlag.All);
    }
  }
}


