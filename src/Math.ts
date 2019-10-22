import * as THREE from 'three';
import { Globals } from './Globals';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';

export class vec3 extends THREE.Vector3 { }
export class vec2 extends THREE.Vector2 { }
export class vec4 extends THREE.Vector4 { }
export class mat3 extends THREE.Matrix3 { }
export class mat4 extends THREE.Matrix4 { }

export class ivec2 {
  public x: Int = 0 as Int;
  public y: Int = 0 as Int;

  public constructor(dx: number = null, dy: number = null) {
    if (dx !== null) {
      this.x = Math.floor(dx) as Int;
    }
    if (dy !== null) {
      this.y = Math.floor(dy) as Int;
    }
  }
  public clone(): ivec2 {
    let ret: ivec2 = new ivec2();
    ret.x = this.x;
    ret.y = this.y;
    return ret;

  }
  public add(v: ivec2): this {
    //Return this as THREE.JS does.
    this.x = (this.x + v.x) as Int;
    this.y = (this.y + v.y) as Int;
    return this;
  }



}
export class RaycastHit {
  public _bHit: boolean;    // Whether the ray intersected the box.
  public _p1Contained: boolean;
  public _p2Contained: boolean;
  public _t: number; // - Time to hit [0,1]
  //  public void* _pPickData; // picked object (BvhObject3*)
  public _vNormal: vec2; //The normal of the plane the raycast hit.
  //Do not include ray data for optimization.

  public trySetClosestHit(closest_t: { value: number }): boolean {
    //Easy way of iterating a closest hit.
    if (this._bHit && (this._t < closest_t.value)) {
      closest_t.value = this._t;
      return true;
    }
    return false;
  }
  public reset() {
    this._bHit = false;
    this._p1Contained = false;
    this._p2Contained = false;
    this._t = Number.MAX_VALUE;
    //  _pPickData = NULL;
  }
  public copyFrom(bh: RaycastHit) {
    this._bHit = bh._bHit;
    this._p1Contained = bh._p1Contained;
    this._p2Contained = bh._p2Contained;
    this._t = bh._t;
  }
}

export class ProjectedRay {
  public Origin: vec2;
  public Dir: vec2;
  public _t: number;
  public _vNormal: vec2;

  // Found the following two cool optimizations on WIlliams et. al (U. Utah)
  public InvDir: vec2;
  public Sign: Int[];

  public IsOpt: boolean;//{ get; private set; }    // - return true if  we optimized this

  public Length: number;// Max length

  public Begin(): vec2 { return this.Origin.clone(); }
  public End(): vec2 { return this.Origin.clone().add(this.Dir); }

  public constructor(origin: vec2, dir: vec2) {
    this.Sign = new Array(2);
    this.Origin = origin;
    this.Dir = dir;

    this.IsOpt = false;
    this.Length = Number.MAX_VALUE;//Must be maxvalue
    this._t = Number.MAX_VALUE;
    this._vNormal = new vec2(0, 0);

    //opt()
    //            //**New - optimization
    //http://people.csail.mit.edu/amy/papers/box-jgt.pdf
    //Don't set to zero. We need infinity (or large value) here.
    this.InvDir.x = 1.0 / this.Dir.x;
    this.InvDir.y = 1.0 / this.Dir.y;

    this.Sign[0] = ((this.InvDir.x < 0) ? 1 : 0) as Int;
    this.Sign[1] = ((this.InvDir.y < 0) ? 1 : 0) as Int;

    this.IsOpt = true;
  }
  public isHit(): boolean {
    return this._t >= 0.0 && this._t <= 1.0;
  }
  public HitPoint(): vec2 {
    let ret: vec2 = this.Begin().add((this.End().sub(this.Begin())).multiplyScalar(this._t));
    return ret;
  }
}


export class Box2f {
  Min: vec2;
  Max: vec2;

  public clone() : Box2f {
    let ret:Box2f = new Box2f();
    ret.copy(this);
    return ret;
  }
  public copy(other:Box2f) : this {
    this.Min = other.Min.clone();
    this.Max = other.Max.clone();
    return this;
  }


  public Width(): number { return this.Max.x - this.Min.x; }
  public Height(): number { return this.Max.y - this.Min.y; }

  public TopRight(): vec2 { return new vec2(this.Max.x, this.Min.y); }
  public BotRight(): vec2 { return new vec2(this.Max.x, this.Max.y); }
  public BotLeft(): vec2 { return new vec2(this.Min.x, this.Max.y); }
  public TopLeft(): vec2 { return new vec2(this.Min.x, this.Min.y); }

  public static construct(min: vec2, max: vec2): Box2f {
    let b: Box2f = new Box2f();
    b.Min = min; b.Max = max;
    return b;
  }
  public constructor(x: number = 0, y: number = 0, w: number = 0, h: number = 0) {
    this.Min = new vec2(x, y);
    this.Max = new vec2(w, h).add(this.Min);
  }

  // public Box2f(vec2 min, vec2 max)
  // {
  //     Min = min;
  //     Max = max;
  // }
  public Center(): vec2 {
    let dai : vec2 = this.Max.clone().sub(this.Min).multiplyScalar(0.5);
    let ret : vec2 = this.Min.clone().add(dai);
    return ret;
  }
  // public static  FlipBoxH(b : Box2f, float w) : Box2f
  // {
  //     //Flip the box inside of a larger box (w)
  //     Box2f ret = new Box2f();
  //     ret.Min.x = w - b.Max.x;
  //     ret.Max.x = w - b.Min.x;

  //     ret.Min.y = b.Min.y;
  //     ret.Max.y = b.Max.y;
  //     return ret;
  // }
  // public static Box2f FlipBoxV(Box2f b, float h)
  // {
  //     //Flip the box inside of a larger box (h)
  //     Box2f ret = new Box2f();
  //     ret.Min.y = h - b.Max.y;
  //     ret.Max.y = h - b.Min.y;

  //     ret.Min.x = b.Min.x;
  //     ret.Max.x = b.Max.x;
  //     return ret;
  // }
  // public Rectangle ToXNARect()
  // {
  //     Rectangle r = new Rectangle();

  //     r.X = (int)(Min.x);
  //     r.Y = (int)(Min.y);
  //     r.Width = (int)(Max.x - Min.x);
  //     r.Height = (int)(Max.y - Min.y);

  //     return r;
  // }

  public static GetIntersectionBox_Inclusive(a: Box2f, b: Box2f): Box2f {
    let ret = new Box2f();

    ret.Min.x = Number.MAX_VALUE;
    ret.Min.y = Number.MAX_VALUE;
    ret.Max.x = -Number.MAX_VALUE;
    ret.Max.y = -Number.MAX_VALUE;


    if (a.Min.x >= b.Min.x && a.Min.x <= b.Max.x) {
      ret.Min.x = Math.min(ret.Min.x, a.Min.x);
    }
    if (a.Max.x <= b.Max.x && a.Max.x >= b.Min.x) {
      ret.Max.x = Math.max(ret.Max.x, a.Max.x);
    }
    if (a.Min.y >= b.Min.y && a.Min.y <= b.Max.y) {
      ret.Min.y = Math.min(ret.Min.y, a.Min.y);
    }
    if (a.Max.y <= b.Max.y && a.Max.y >= b.Min.y) {
      ret.Max.y = Math.max(ret.Max.y, a.Max.y);
    }

    if (b.Min.x >= a.Min.x && b.Min.x <= a.Max.x) {
      ret.Min.x = Math.min(ret.Min.x, b.Min.x);
    }
    if (b.Max.x <= a.Max.x && b.Max.x >= a.Min.x) {
      ret.Max.x = Math.max(ret.Max.x, b.Max.x);
    }
    if (b.Min.y >= a.Min.y && b.Min.y <= a.Max.y) {
      ret.Min.y = Math.min(ret.Min.y, b.Min.y);
    }
    if (b.Max.y <= a.Max.y && b.Max.y >= a.Min.y) {
      ret.Max.y = Math.max(ret.Max.y, b.Max.y);
    }
    return ret;
  }
  public GenResetExtents()
  {
      this.Min = new vec2(Number.MAX_VALUE,Number.MAX_VALUE);
      this.Max = new vec2(-Number.MAX_VALUE, -Number.MAX_VALUE);
  }
  public ExpandByPoint(  v : vec2)
  {
    this.Min.x = Math.min(this.Min.x, v.x);
    this.Min.y = Math.min(this.Min.y, v.y);
    this.Max.x = Math.max(this.Max.x, v.x);
    this.Max.y = Math.max(this.Max.y, v.y);
  }
  public BoxIntersect_EasyOut_Inclusive(cc: Box2f): boolean {
    return cc.Min.x <= this.Max.x && cc.Min.y <= this.Max.y && this.Min.x <= cc.Max.x && this.Min.y <= cc.Max.y;
  }
  public ContainsPointInclusive(point: vec2): boolean {
    if (point.x < this.Min.x) {
      return false;
    }
    if (point.y < this.Min.y) {
      return false;
    }
    if (point.x > this.Max.x) {
      return false;
    }
    if (point.y > this.Max.y) {
      return false;
    }
    return true;
  }
  private bounds(x: Int): vec2 {
    if (x === 0) { return this.Min.clone(); }
    return this.Max.clone();
  }
  public RayIntersect(ray: ProjectedRay, bh: { value: RaycastHit }): boolean {
    if (ray.IsOpt == false) {
      //Error.
      Globals.debugBreak();
    }

    let txmin: number, txmax: number, tymin: number, tymax: number;
    let bHit: boolean;

    txmin = (this.bounds(ray.Sign[0]).x - ray.Origin.x) * ray.InvDir.x;
    txmax = (this.bounds(1 - ray.Sign[0] as Int).x - ray.Origin.x) * ray.InvDir.x;

    tymin = (this.bounds(ray.Sign[1]).y - ray.Origin.y) * ray.InvDir.y;
    tymax = (this.bounds(1 - ray.Sign[1] as Int).y - ray.Origin.y) * ray.InvDir.y;

    if ((txmin > tymax) || (tymin > txmax)) {
      // if (bh != null)
      // {
      bh.value._bHit = false;
      // }
      return false;
    }
    if (tymin > txmin) {
      txmin = tymin;
    }
    if (tymax < txmax) {
      txmax = tymax;
    }

    bHit = ((txmin >= 0.0) && (txmax <= ray.Length));

    //**Note changed 20151105 - this is not [0,1] this is the lenth along the line in which 
    // the ray enters and exits the cube, so any value less than the maximum is valid

    // if (bh != null)
    // {
    bh.value._bHit = bHit;
    bh.value._t = txmin;
    // }

    return bHit;
  }
}