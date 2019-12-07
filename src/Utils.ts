import * as THREE from 'three';
import { Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, BoxHelper } from 'three';
import { Dictionary } from './Base';
import { vec4, ivec2 } from './Math';
import { Globals } from './Globals';
import { toInt, Int } from './Int';

type WithProperty<K extends string, V = {}> = {
  [P in K]: V
}
export enum BrowserType {
  Chrome, Edge, IE, Opera, Firefox, Safari, Blink, Undefined
}
export class Utils {
  public static parseIVec2(str: string): ivec2 {
    let arr = Utils.parseTuple(str);
    if (!arr || arr.length !== 2) {
      throw "parseTuple returned invalid data.";
    }
    let ret: ivec2 = new ivec2(arr[0], arr[1]);
    return ret;
  }
  public static parseTuple(str: string, noParens: boolean = true): Array<number> {
    //Parse a string of the form (012,012,012,...)
    let ret: Array<number> = new Array<number>();

    let cn: string = "";
    let error: boolean = false;
    let state: number = 0; // 0=none, 1 = (, 2 = 0-9,.-, 3 = )
    let dec: boolean = false;
    let sign: boolean = false;

    let push_number = () => {
      try {
        let pn: number = Utils.parseNumber(cn);
        ret.push(pn);
        cn = "";
        dec = false;
        sign = false;
      }
      catch (ex) {
        error = true;
      }
    }

    for (let c of str) {
      if (c === '(') {
        if (state === 0) {
          state = 1;
        }
        else {
          error = true;
        }
      }
      else if (c === ')') {
        if (state === 2 && cn.length > 0) {
          push_number();
          state = 3;
          break;
        }
        else {
          error = true;
        }
      }
      else if (c === '-' || c === '+') {
        if ((state >= 1 || noParens) && cn.length === 0 && sign === false) {
          state = 2;
          cn += c;
          sign = true;
        }
        else {
          error = true;
        }
      }
      else if ((c == '.')) {
        if ((state >= 1 || noParens) && dec === false) {
          state = 2;
          cn += c;
          dec = true;
        }
        else {
          error = true;
        }
      }
      else if ((c >= '0' && c <= '9')) {
        if (state >= 1 || noParens) {
          state = 2;
          cn += c;
        }
        else {
          error = true;
        }
      }
      else if (c == ',') {
        if (state === 2 && cn.length > 0) {
          push_number();
        }
        else {
          error = true;
        }
      }
      if (error) {
        Globals.debugBreak();
        throw "Error parsing ivec2";
        break;
      }
    }

    if (state === 2 && noParens) {
      push_number();
    }
    else if (state !== 3 && noParens === false) {
      Globals.debugBreak();
      throw "Error parsing ivec2 - no end parentheses";
    }

    return ret;
  }
  public static startsWith(haystack: string, needle: string, caseSensitive: boolean = false): boolean {
    let b: boolean = true;
    if (needle.length > haystack.length) {
      return false;
    }

    let sn, sh;
    sn = Utils.copyString(needle);
    sh = Utils.copyString(haystack);
    if (!caseSensitive) {
      sn = sn.toLowerCase();
      sh = sh.toLowerCase();
    }

    //Need for unicode normalization, for now, this works.
    //https://stackoverflow.com/questions/10805711/javascript-string-comparison-fails-when-comparing-unicode-characters/10805884
    for (let ci = 0; ci < sh.length && ci < sn.length; ++ci) {
      if (sn[ci] !== sh[ci]) {
        b = false;
        break;
      }
    }
    return b;
  }
  public static getParam(s: string): string {
    const url_params = (new URL("" + document.location)).searchParams;
    let v = url_params.get(s);
    return v;
  }
  public static getBoolParam(s: string): boolean {
    let b: boolean = Utils.parseBool(Utils.getParam(s));
    return b;
  }
  public static getUrlParams(): Map<string, string> {
    let ret: Map<string, string> = new Map<string, string>();
    //const url_params = (new URL("" + document.location)).searchParams;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
      let hash = hashes[i].split('=');
      ret.set(hash[0], hash[1]);
    }
    return ret;
  }
  public static isValidJson(str: string) {
    try {
      JSON.parse(str);
    }
    catch (e) {
      return false;
    }
    return true;
  }
  public static getBrowser(): BrowserType {
    // Internet Explorer 6-11
    // @ts-ignore
    if (/*@cc_on!@*/false || !!document.documentMode) {
      return BrowserType.IE;
    }

    // Edge 20+
    // @ts-ignore
    if (/*isEdge = !isIE &&*/ !!window.StyleMedia) {
      return BrowserType.Edge;
    }

    // Opera 8.0+
    // @ts-ignore
    if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
      return BrowserType.Opera;
    }
    // Firefox 1.0+
    // @ts-ignore
    if (typeof InstallTrigger !== 'undefined') {
      return BrowserType.Firefox;
    }
    // Safari 3.0+ "[object HTMLElementConstructor]" 
    // @ts-ignore
    if (/constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification))) {
      return BrowserType.Safari;
    }

    // Chrome 1 - 71
    // @ts-ignore
    if (!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)) {
      return BrowserType.Chrome;
    }
    // Blink engine detection
    // @ts-ignore
    // if ((isChrome || isOpera) && !!window.CSS) {
    //   return BrowserType.Blink;
    // }

    return BrowserType.Undefined;
  }
  public static loadingDetails(det: string) {
    $('#loadingDetails').html(det);
  }
  public static lcmp(a: string, b: string, case_sensitive: boolean = false) :boolean {
    let d_k = Utils.copyString(a).trim();
    let d_s = Utils.copyString(b).trim();
    if (!case_sensitive) {
      d_k = d_k.toLowerCase();
      d_s = d_s.toLowerCase();
    }
    let be = (d_k === d_s);
    return be;
  }
  public static isNullorUndefined(x: any) {
    return (x === null) || (x === undefined);
  }
  public static isNotNullorUndefined(x: any) {
    return !Utils.isNullorUndefined(x);
  }
  public static parseNumber(s: string): number {
    let t = parseFloat(s);
    return t;
  }
  public static parseInt(s: string): Int {
    let t = toInt(parseInt(s));
    return t;
  }
  public static parseBool(s: string): boolean {
    let t = Utils.copyString(s).toLowerCase().trim();
    if (t === "true") return true;
    if (t === "1") return true;
    return false;
  }
  public static copyString(s: string): string {
    let ret: string = (' ' + s).slice(1);

    return ret;
  }
  public static enumToString(value: number, object_keys: Array<string>, caseSensitive: boolean = false): string {
    let r: string = Utils.enumConverter(null, value, object_keys, caseSensitive, false) as string;
    if (r === null) {
      Globals.logError("Enum conversion failed.")
      Globals.debugBreak();
    }
    return r;
  }
  public static stringToEnum(enum_string: string, object_keys: Array<string>, caseSensitive: boolean = false): number {
    let r: number = Utils.enumConverter(enum_string, null, object_keys, caseSensitive, true) as number;
    if (r === null) {
      Globals.logError("Enum conversion failed.")
      Globals.debugBreak();
    }
    return r;
  }
  private static enumConverter(in_s: string, in_v: number, object_keys: Array<string>, caseSensitive: boolean, returnValue: boolean): any {
    //returns the enum value as an integer of the given thing.
    let kv = Utils.enumKeyVals(object_keys);

    for (let [k, v] of kv) {
      if (returnValue) {
        //return enum value
        let d_k = Utils.copyString(k).trim();
        let d_s = Utils.copyString(in_s).trim();
        if (!caseSensitive) {
          d_k = d_k.toLowerCase();
          d_s = d_s.toLowerCase();

        }
        if (d_k === d_s) {
          return v;
        }
      }
      else {
        // return enum key
        if (in_v === v) {
          return k;
        }
      }
    }
    return null;
  }
  private static enumKeyVals(kv: Array<string>): Map<string, number> {
    //Turns an enum into a map of string=>number ex. ["MyEnumKey", 0]
    //Usage:
    //    for(let [k,v] of enumKeyVals(Object.keys(MyEnum))) { ... }
    //Note:  Unfortunately this won't work for negative value enums.
    //       By syntax, numbers can't start identifiers, therefore all positive enum numbers will be correctly ordered, but not negative.
    //       Further, browsers are not required to order Object.keys. 
    //          See: https://stackoverflow.com/questions/280713/elements-order-in-a-for-in-loop
    //       See: object.keys out of order - https://hackernoon.com/out-of-order-keys-in-es6-objects-d5cede7dc92e
    let ret: Map<string, number> = new Map<string, number>();

    if (kv.length % 2 !== 0) {
      Globals.logError("enumKeyVals - Enum values were not evenly divisible. ?");
      Globals.debugBreak();
    }

    let valoff: number = kv.length / 2;

    for (let i = 0; i < valoff; ++i) {
      let key = kv[i + valoff];
      let val = parseInt(kv[i]);// as number;
      ret.set(key, val);
    }

    return ret;
  }
  public static multiplyVec4(a: vec4, b: vec4): vec4 {
    a.x *= b.x;
    a.y *= b.y;
    a.z *= b.z;
    a.w *= b.w;
    return a;
  }
  public static getWorldPosition(x: Object3D): Vector3 {
    let v: Vector3 = new Vector3();
    x.getWorldPosition(v);
    return v;
  }
  public static className(x: Object): string {
    return x.constructor.name;
  }
  public static classNameT<T>(tt: new () => T): string {
    let sz: string = typeof (tt);
    return sz;
  }
  public static lerpColor(a: Color, b: Color, x: number): Color {
    let ret: Color = a.clone().add(b.clone().sub(a).multiplyScalar(x));
    return ret;
  }
  public static clampScalar(cin: number, cmin: number, cmax: number): number {
    let ret: number = Math.max(cmin, Math.min(cmax, cin));
    return ret;
  }
  public static clampVector3(cin: Vector3, cmin: Vector3, cmax: Vector3): Vector3 {
    let c: Vector3 = new Vector3();
    c.x = Math.max(cmin.x, Math.min(cmax.x, cin.x));
    c.y = Math.max(cmin.y, Math.min(cmax.y, cin.y));
    c.z = Math.max(cmin.z, Math.min(cmax.z, cin.z));
    return c;
  }
  public static clampColor(cin: Color, cmin: Color, cmax: Color): Color {
    let c: Color = new Color();
    c.r = Math.max(cmin.r, Math.min(cmax.r, cin.r));
    c.g = Math.max(cmin.g, Math.min(cmax.g, cin.g));
    c.b = Math.max(cmin.b, Math.min(cmax.b, cin.b));
    return c;
  }
  public static vec3ToColor(cin: Vector3): Color {
    return new Color(cin.x, cin.y, cin.z);
  }
  public static colorToVec3(cin: Color): Vector3 {
    return new Vector3(cin.r, cin.g, cin.b);
  }
  public static cosineInterpolate(y1: number, y2: number, mu: number) {
    //http://paulbourke.net/miscellaneous/interpolation/
    let mu2: number = 0;
    mu2 = (1 - Math.cos(mu * Math.PI)) * 0.5;
    return (y1 * (1 - mu2) + y2 * mu2);
  }
  public static getSortedKeys(obj: Dictionary<number>, asc: boolean = false): Array<string> {
    let keys = Object.keys(obj);
    return keys.sort(
      asc ?
        function (a: string, b: string) {
          return obj[b] - obj[a];
        } :
        function (a: string, b: string) {
          return obj[a] - obj[b];
        });
  }
  public static setMeshColorEm(mod: THREE.Mesh, val: Color) {
    if (val) {
      if (mod.material && mod.material instanceof THREE.MeshStandardMaterial) {
        let mat: THREE.MeshStandardMaterial = mod.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) {
          mat.emissive.setRGB(val.r, val.g, val.b);
        }
      }
    }
  }
  public static getMeshColorEm(mod: THREE.Mesh): Color {
    let c: Color = new Color();
    if (mod.material && mod.material instanceof MeshStandardMaterial) {
      let mat: THREE.MeshStandardMaterial = mod.material as THREE.MeshStandardMaterial;
      if (mat) {
        c.copy(mat.emissive);
      }
    }
    return c;
  }
  public static setMeshColor(mod: THREE.Mesh, val: Color): boolean {
    if (val) {
      if (mod.material) {
        if (mod.material instanceof MeshBasicMaterial) {
          mod.material.color.setRGB(val.r, val.g, val.b);
          return true;
        }
        else if (mod.material instanceof MeshStandardMaterial) {
          mod.material.color.setRGB(val.r, val.g, val.b);
          return true;
        }
      }
    }
    return false;
  }
  public static getMeshColor(mod: THREE.Mesh): Color {
    let c: Color = new Color();
    if (mod.material) {
      if (mod.material instanceof MeshBasicMaterial) {
        c.copy(mod.material.color);
      }
      else if (mod.material instanceof MeshStandardMaterial) {
        c.copy(mod.material.color);
      }
    }
    return c;
  }

  public static duplicateModel(mod: THREE.Mesh, material: boolean = false): THREE.Mesh {
    let ret: THREE.Mesh = mod.clone();
    //Don't do this.
    // ret.traverse((node: Object3D) => {
    //   if (node instanceof THREE.Mesh) {
    //     if (node.material instanceof THREE.MeshBasicMaterial) {
    //       node.material = node.material.clone();
    //     }
    //     if (node.material instanceof THREE.MeshStandardMaterial) {
    //       node.material = node.material.clone();
    //     }
    //   }
    // });
    return ret;
  }
  public static toFloat32ArrayV4(vertices: Array<Vector4>): Float32Array {
    let verts: Array<number> = new Array<number>();
    for (var i = 0; i < vertices.length; ++i) {
      verts.push(vertices[i].x);
      verts.push(vertices[i].y);
      verts.push(vertices[i].z);
      verts.push(vertices[i].w);
    }
    return new Float32Array(verts);
  }
  public static toFloat32ArrayV3(vertices: Array<Vector3>): Float32Array {
    let verts: Array<number> = new Array<number>();
    for (var i = 0; i < vertices.length; ++i) {
      verts.push(vertices[i].x);
      verts.push(vertices[i].y);
      verts.push(vertices[i].z);
    }
    return new Float32Array(verts);
  }
  public static toFloat32ArrayV2(vertices: Array<Vector2>): Float32Array {
    let verts: Array<number> = new Array<number>();
    for (var i = 0; i < vertices.length; ++i) {
      verts.push(vertices[i].x);
      verts.push(vertices[i].y);
    }
    return new Float32Array(verts);
  }

}