import * as THREE from 'three';
import { Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material } from 'three';
import { ModelObjectCallback, Random, MaterialDuplicate } from './Base';
import { Globals, GameState } from './Globals';

enum GameObjectId {
  PhysicsObject
}

export interface PhysicsObjectCollisionCheck { (b: PhysicsObject3D): void; }
export interface PhysicsObjectDestroyCheck { (ob: PhysicsObject3D): boolean; }
export interface PhysicsObjectDestroyCallback { (ob: PhysicsObject3D): void; }
export interface PhysicsObjectDestroyCallback { (ob: PhysicsObject3D): void; }
export class PhysicsObject3D extends THREE.Object3D {
  public getId(): GameObjectId { return GameObjectId.PhysicsObject; }
  // protected _bbox = new THREE.Box3();
  private _velocity: Vector3 = new Vector3();
  private _isDestroyed: boolean = false;
  private _rotation: Vector3 = new Vector3();
  private _scale: Vector3 = new Vector3();
  private _boxHelper: THREE.BoxHelper = null;
  private _box3Helper: THREE.Box3Helper = null;
  private _flash: MaterialDuplicate = null;
  public IsCollider: boolean = false;

  private _model: THREE.Mesh = null;
  get model(): THREE.Mesh { return this._model; }

  private _ghost = false; // set to true to prevent this object from being a physics collider
  get ghost(): boolean { return this._ghost; }
  set ghost(b: boolean) { this._ghost = b; }

  private _health: number = 100;
  get health(): number { return this._health; }
  set health(v: number) { this._health = v }

  protected _afterLoadModel: ModelObjectCallback = null; //Called after ship is loaded.  This is actually implemented (sloppily) by subclasses.
  public OnDestroy: PhysicsObjectDestroyCallback = null;

  public isCollidable(): boolean {
    let b: boolean = true;
    b = b && this.IsDestroyed === false;
    b = b && this.model && this.model.visible;
    return b;
  }

  //Default destroy routine for all objects.
  private _destroy: PhysicsObjectDestroyCheck = function (ob: PhysicsObject3D) {

    return false;
    // //Simple length check doesn't work for ship creation as the ships need to be created on a plane rather than a sphere
    // let ca: boolean = Math.abs(ob.WorldPosition.z - g_player.WorldPosition.z) >= 350; //(ob.WorldPosition.z*ob.WorldPosition.z) >=  g_player.object_destroy_dist_sq;//.distanceToSquared(player.WorldPosition) >= (camera.far * camera.far);
    // //Destroy if we are behind the player (we only move forward in the z)
    // let cb: boolean = ob.position.z - g_player.position.z > 80;
    // //Destroy if our scale is zero
    // let cc: boolean = (ob.scale.x < 0.0001) && (ob.scale.y < 0.0001) && (ob.scale.z < 0.0001);
    // //Opacity is zero
    // let cd: boolean = ob.opacity <= 0.0001;

    // return ca || cb || cc || cd;
  }
  get DestroyCheck(): PhysicsObjectDestroyCheck { return this._destroy; }
  set DestroyCheck(v: PhysicsObjectDestroyCheck) { this._destroy = v; }


  private _box_cached: Box3 = new Box3();

  get Box(): Box3 {
    return this._box_cached;
  }
  get IsDestroyed(): boolean { return this._isDestroyed; }
  set IsDestroyed(b: boolean) { this._isDestroyed = b; }
  get Velocity(): Vector3 { return this._velocity; }
  set Velocity(val: Vector3) { this._velocity = val; }
  get RotationDelta(): Vector3 { return this._rotation; }
  set RotationDelta(val: Vector3) { this._rotation = val; }
  get ScaleDelta(): Vector3 { return this._scale; }
  set ScaleDelta(val: Vector3) { this._scale = val; }
  set OpacityDelta(val: number) { this._opacityDelta = val; }
  get OpacityDelta(): number { return this._opacityDelta; }
  private _opacityDelta: number = 0;

  public constructor(isGhost: boolean = false) {
    super();
    this.ghost = isGhost;

    Globals.physics3d.add(this);

    //By default, set us to be the default box so, in case models fail to load, we can
    //still see them.
    if (Globals.isDebug()) {
      //this.setModel(this.createDefaultGeo());
    }
  }
  public destroy() {
    Globals.physics3d.destroy(this);
  }
  private createMaterialDuplicate() {
    if (!this._flash) {
      this._flash = new MaterialDuplicate(this);
    }
  }
  public get opacity(): number {
    if (!this._flash) {
      return 1;
    }
    else {
      return this._flash.opacity;
    }
  }
  public set opacity(o: number) {
    this.createMaterialDuplicate();
    this._flash.opacity = o;
  }
  public set color(c: Color) {
    this.setColor(c, null);
  }
  public setColor(c: Color, meshName: string = null): boolean {
    this.createMaterialDuplicate();
    return this._flash.setColor(c, meshName);
  }
  public flash(color: Color, durationInSeconds: number, saturation: number) {
    this.createMaterialDuplicate();
    this._flash.flash(color, durationInSeconds, saturation);
  }
  public update(dt: number) {

    this.position.add(this.Velocity.clone().multiplyScalar(dt));
    let rdt = this.RotationDelta.clone().multiplyScalar(dt);
    this.rotation.x = (this.rotation.x + rdt.x) % (Math.PI * 2);
    this.rotation.y = (this.rotation.y + rdt.y) % (Math.PI * 2);
    this.rotation.z = (this.rotation.z + rdt.z) % (Math.PI * 2);
    this.scale.x += this._scale.x * dt;
    if (this.scale.x < 0) { this.scale.x = 0.00001; } // why 0.001? see https://github.com/aframevr/aframe-inspector/issues/524
    this.scale.y += this._scale.y * dt;
    if (this.scale.y < 0) { this.scale.y = 0.00001; }
    this.scale.z += this._scale.z * dt;
    if (this.scale.z < 0) { this.scale.z = 0.00001; }

    if (this._flash) {
      this._flash.update(dt);
    }

    if (this._opacityDelta !== 0) {
      this.createMaterialDuplicate();

      let op: number = this._flash.opacity;

      if ((this._opacityDelta > 0 && op < 1) || (this._opacityDelta < 0 && op > 0)) {
        op += this._opacityDelta * dt;
        op = Math.min(1, Math.max(0, op));
        this._flash.opacity = op;
      }
    }

    //Make sure to remove helpers BEFORE calculating the actual box.
    this.removeHelpers();
    //Compute BB
    this._box_cached = new THREE.Box3().setFromObject(this);
    if (Globals.isDebug()) {
      //Must come in this order 
      this._box3Helper = new THREE.Box3Helper(this._box_cached, new THREE.Color(0x00ff00));
      Globals.scene.add(this._box3Helper);

      if (this._boxHelper) {

        this.add(this._boxHelper);
      }

    }
  }
  public removeHelpers() {
    if (Globals.isDebug()) {
      if (this._boxHelper) {
        this.remove(this._boxHelper);
      }
      if (this._box3Helper) {
        Globals.scene.remove(this._box3Helper);
        this._box3Helper = null;
      }
    }
  }
  public get WorldPosition(): Vector3 {
    let v = new Vector3();
    this.getWorldPosition(v);
    return v;
  }
  private _modelHidden: boolean = false;
  public hideModel() {
    if (this._model) {
      this._model.traverse(function (object: Object3D) { object.visible = false; });
      this._modelHidden = true;
    }
  }
  public showModel() {
    if (this._model) {
      this._model.traverse(function (object: Object3D) { object.visible = true; });
      this._modelHidden = false;
    }
  }
  public setModel(m: THREE.Mesh) {
    this.removeHelpers();

    if (this._model) {
      this.remove(this._model);
    }

    this._model = null;

    if (m !== null) {
      this._model = m;
      if (Globals.isDebug()) {
        this._boxHelper = new THREE.BoxHelper(this._model, new THREE.Color(0xffff00));
      }

      this.add(this._model);

      if (this._modelHidden) {
        this.hideModel();
      }
      else {
        this.showModel();
      }
    }
  }
  protected createDefaultGeo(): THREE.Mesh {
    var geo = new THREE.BoxBufferGeometry(.3, .03, .2);
    geo.computeBoundingBox(); // for hit area
    var mat = new THREE.MeshBasicMaterial({
      //map: this._texture,
      transparent: false,
      side: THREE.DoubleSide,
      color: 0x9FC013,
    });
    geo.computeBoundingBox();

    let mesh: THREE.Mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(Random.float(0.8, 5), Random.float(0.8, 2), Random.float(0.8, 2));

    return mesh;
  }

}
interface CollisionHandler { (me: PhysicsObject3D, other: PhysicsObject3D): void; }
enum ColliderClass { Active = 2, Passive = 1, None = 0 }
class CollisionManifold {
  //buckets of objects separated by type.
  //Active - the collider has a collide() method and will actively collide
  private _active_bucket: Map<GameObjectId, Array<PhysicsObject3D>> = new Map<GameObjectId, Array<PhysicsObject3D>>()

  //Passive - objects are collidees, but they do not have a collide() method
  private _passive_bucket: Map<GameObjectId, Array<PhysicsObject3D>> = new Map<GameObjectId, Array<PhysicsObject3D>>()

  //A quick map to identify if a physics object is active or passive
  private _class_identifier: Map<GameObjectId, ColliderClass> = new Map<GameObjectId, ColliderClass>();

  //Handlers for active 
  private _handlers: Map<GameObjectId, Map<GameObjectId, CollisionHandler>> = new Map<GameObjectId, Map<GameObjectId, CollisionHandler>>();

  private removePassiveCollider(x: PhysicsObject3D) {
    let szclass: GameObjectId = x.getId();
    if (this._passive_bucket.has(szclass)) {
      let n = this._passive_bucket.get(szclass).indexOf(x);
      if (n != -1) {
        this._passive_bucket.get(szclass).splice(n, 1);
      }
    }
  }
  private removeActiveCollider(x: PhysicsObject3D) {
    let szclass: GameObjectId = x.getId();
    if (this._active_bucket.has(szclass)) {
      let n = this._active_bucket.get(szclass).indexOf(x);
      if (n != -1) {
        this._active_bucket.get(szclass).splice(n, 1);
      }
    }
  }
  private registerActiveCollider(x: PhysicsObject3D) {
    //This shouldn't be needed since we already know the collision classification at startup
    //removePassiveCollider(x);

    let szclass: GameObjectId = x.getId();
    if (!this._active_bucket.has(szclass)) {
      this._active_bucket.set(szclass, new Array<PhysicsObject3D>());
    }
    if (this._active_bucket.get(szclass).indexOf(x) === -1) {
      this._active_bucket.get(szclass).push(x);//Really - this line here should be all that is needed in this method if this is coded correctly.
    }
  }
  private registerPassiveCollider(x: PhysicsObject3D) {
    let szclass: GameObjectId = x.getId();
    let p_has: boolean = this._passive_bucket.has(szclass) && this._passive_bucket.get(szclass).indexOf(x) !== -1;
    let a_has: boolean = this._active_bucket.has(szclass) && this._active_bucket.get(szclass).indexOf(x) !== -1;

    if (!p_has && !a_has) {
      if (!this._passive_bucket.has(szclass)) {
        this._passive_bucket.set(szclass, new Array<PhysicsObject3D>());
      }
      this._passive_bucket.get(szclass).push(x);//Really - this line here should be all that is needed in this method if this is coded correctly.
    }
  }
  private classifyCollider(szclass: GameObjectId): ColliderClass {
    if (this._class_identifier.has(szclass)) {
      return this._class_identifier.get(szclass);
    }
    return ColliderClass.None; //no classification, does not collide.
  }
  private promoteCollider(szclass: GameObjectId, eclass: ColliderClass) {
    //Promote to passive/active based on the collision function
    let cur_class: ColliderClass = this.classifyCollider(szclass);

    //Might need to conver these to int?
    if (cur_class < eclass) {
      this._class_identifier.set(szclass, eclass);
    }
  }
  public collide(sza: GameObjectId, szp: GameObjectId, func: CollisionHandler) {
    //check the arguments https://stackoverflow.com/questions/50550382/how-to-get-the-type-of-t-inside-generic-method-in-typescript
    //Adds a collision handler.
    //Assuming this is possible.
    //let sza: string = Utils.className(cA);
    this.promoteCollider(sza, ColliderClass.Active);

    //let szp: string = Utils.classNameT<P>(cP);
    this.promoteCollider(szp, ColliderClass.Passive);

    if (!this._handlers.has(sza)) {
      this._handlers.set(sza, new Map<GameObjectId, CollisionHandler>());
    }
    this._handlers.get(sza).set(szp, func);
  }
  private getHandler(a_class: GameObjectId, b_class: GameObjectId): CollisionHandler {
    if (this._handlers.has(a_class)) {
      let m: Map<GameObjectId, CollisionHandler> = this._handlers.get(a_class);
      if (m.has(b_class)) {
        return m.get(b_class);
      }
    }
    return null;
  }
  public registerCollider(ob: PhysicsObject3D) {
    //should be called directly from physisobject constructor
    let sza = ob.getId();

    let c: ColliderClass = this.classifyCollider(sza);
    if (c == ColliderClass.Active) {
      this.registerActiveCollider(ob);
      ob.IsCollider = true;
    }
    else if (c == ColliderClass.Passive) {
      this.registerPassiveCollider(ob);
      ob.IsCollider = true; // default this to false.
    }
    else {
      //This object does not collide with anything.  Great!
      let n = 0;
      n++;
    }
  }
  public deregisterCollider(ob: PhysicsObject3D) {
    if (ob.IsCollider) {
      let sza = ob.getId();
      let c: ColliderClass = this.classifyCollider(sza);
      if (c == ColliderClass.Active) {
        this.removeActiveCollider(ob);
      }
      else if (c == ColliderClass.Passive) {
        this.removePassiveCollider(ob);
      }
    }
  }
  public handleCollisions() {
    //  loop handlers which are an active -> passive/active pair
    //  some handlers won't have any objects, meaning it'd be smarter 'more optimal' to loop over objects first, then
    //  call handlers
    //  of course.. slap on bvh and we make this fast
    let handler_keys = Array.from(this._handlers.keys());
    for (let ih = 0; ih < handler_keys.length; ih++) {
      let aid: GameObjectId = handler_keys[ih];

      if (this._active_bucket.has(aid)) {
        let a_arr: Array<PhysicsObject3D> = this._active_bucket.get(aid);
        let b_keys = Array.from(this._handlers.get(handler_keys[ih]).keys());
        for (let ai = 0; ai < a_arr.length; ai++) {
          let A: PhysicsObject3D = a_arr[ai];

          if (A.isCollidable()) {
            for (let bik = 0; bik < b_keys.length; ++bik) {
              let bid = b_keys[bik];

              if (this._active_bucket.has(bid)) {
                let b_arr: Array<PhysicsObject3D> = this._active_bucket.get(bid);
                for (let bi = 0; bi < b_arr.length; ++bi) {
                  let B: PhysicsObject3D = b_arr[bi];

                  //Second substance check [destroy/visible], since we could have destroyed the model earlier in the loop.
                  if (A.isCollidable() && B.isCollidable()) {
                    if (A.Box.intersectsBox(B.Box)) {
                      let handler: CollisionHandler = this.getHandler(aid, bid);
                      handler(A, B);
                    }
                  }
                }
              }
              else if (this._passive_bucket.has(bid)) {
                let b_arr: Array<PhysicsObject3D> = this._passive_bucket.get(bid);
                for (let bi = 0; bi < b_arr.length; ++bi) {
                  let B: PhysicsObject3D = b_arr[bi];

                  if (B.isCollidable() && A.isCollidable()) {
                    if (A.Box.intersectsBox(B.Box)) {
                      let handler: CollisionHandler = this.getHandler(aid, bid);
                      handler(A, B);
                    }
                  }
                }
              }
            }
          }

        }
      }


    }


  }

}
interface DestroyAllObjectsFunction { (ob: PhysicsObject3D): boolean; }
interface FindAllObjectsFunction { (ob: PhysicsObject3D): boolean; }
export class PhysicsManager3D {
  private _objects: Array<PhysicsObject3D> = new Array<PhysicsObject3D>();
  private _collide: Array<PhysicsObject3D> = new Array<PhysicsObject3D>();
  private toDestroy: Array<PhysicsObject3D> = new Array<PhysicsObject3D>();

  private _manifold: CollisionManifold = new CollisionManifold();

  public get collisions(): CollisionManifold {
    return this._manifold;
  }
  public get Objects(): Array<PhysicsObject3D> {
    return this._objects;
  }

  public constructor() {
  }
  public findObjectOfType(fn: FindAllObjectsFunction): boolean {
    if (fn) {
      for (let i = 0; i < this._objects.length; ++i) {
        //For why this looks weird see: https://github.com/Microsoft/TypeScript/issues/5236
        if (fn(this._objects[i])) {
          return true;
        }
      }
    }
    else {
      Globals.logError("findobjectoftype - no function supplied.");
    }
    return false;
  }
  public destroyAllObjects(fn: DestroyAllObjectsFunction) {
    if (fn) {
      for (let i = 0; i < this._objects.length; ++i) {
        //For why this looks weird see: https://github.com/Microsoft/TypeScript/issues/5236
        if (fn(this._objects[i])) {
          this.destroy(this._objects[i]);
        }
      }
    }
    else {
      Globals.logError("destroyAllObjects - no function supplied.");
    }
  }
  public add(obj: PhysicsObject3D) {
    for (let i = this._objects.length - 1; i >= 0; --i) {
      if (this._objects[i] == obj) {
        Globals.logError("Tried to add duplicate phy obj.");
        return;
      }
    }
    this._objects.push(obj);
    if (!obj.ghost) {
      this.collisions.registerCollider(obj);
    }

    Globals.scene.add(obj);
  }
  public destroy(obj: PhysicsObject3D) {
    if (obj.IsDestroyed === false) {
      Globals.scene.remove(obj);
      this.toDestroy.push(obj);
      if (obj.OnDestroy) {
        obj.OnDestroy(obj);
      }
      obj.removeHelpers();
      obj.IsDestroyed = true;
    }
  }
  public update(dt: number): void {
    Globals.prof.begin("physics-destroy&update");
    //Preliminary destroy . distance
    for (let i = 0; i < this._objects.length; ++i) {
      let ob = this._objects[i];

      if (ob.DestroyCheck(ob)) {
        //Objects must have a destroy function defined.
        this.destroy(ob);
      }
      else {
        ob.update(dt);
      }
    }
    Globals.prof.end("physics-destroy&update");

    //Prevent physics from happening when ship is destroyed
    if (Globals.gameState !== GameState.GameOver) {
      Globals.prof.begin("physics-collide");
      this.collisions.handleCollisions();
      Globals.prof.end("physics-collide");
    }


    Globals.prof.begin("physics-removal");
    //Remove destroyed.
    for (let i = this.toDestroy.length - 1; i >= 0; --i) {
      let ob = this.toDestroy[i];
      if (ob.IsDestroyed) {

        for (let j = this._objects.length - 1; j >= 0; --j) {
          if (this._objects[j] == ob) {
            this._objects.splice(j, 1);//delete
          }
        }
        this.collisions.deregisterCollider(ob);
      }
    }
    Globals.prof.end("physics-removal");

    this.toDestroy = new Array<PhysicsObject3D>();
  }
}
