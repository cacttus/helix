import * as THREE from 'three';
import { Vector3, Vector2, Vector4, Color, ShapeUtils, Mesh, PerspectiveCamera, Box3, Geometry, Scene, Matrix4, Matrix3, Object3D, AlwaysStencilFunc, MeshStandardMaterial, MeshBasicMaterial, RGBA_ASTC_10x5_Format, Material, BoxHelper } from 'three';
import { Dictionary } from './Base';
import { vec4 } from 'Math';

export class Utils {
  public static multiplyVec4(a: vec4, b: vec4) : vec4 {
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