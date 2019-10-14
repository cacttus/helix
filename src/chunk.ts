
import * as THREE from 'three';
 

export default class Chunk extends THREE.Object3D {
  private _errors : string = "";
  public _program : WebGLProgram;
  private _vs : string;
  private _gs : string;
  private _fs : string;

  private _pos : THREE.Vector3;

  public constructor() {
    super();
    let g : THREE.BufferGeometry = new THREE.BufferGeometry();

  }

  public draw() : void {

  }

}