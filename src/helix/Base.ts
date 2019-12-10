/**
 * @file Base.ts
 * @author Derek Page
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
import * as THREE from 'three';
import MersenneTwister from "mersenne-twister";
import { Globals } from './Globals';
import { Utils } from './Utils';
import { vec4, vec3, vec2, ivec2 } from './Math';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';

export interface AfterLoadFunction { (x: any): void; };

/** 
 * @description Generics
 */
export class HashMap<V> {
  private _map: Map<number, V> = new Map<number, V>();

  private hash(s: string) :number{
    //https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash | 0;
  }

  *[Symbol.iterator](): IterableIterator<V> {
    //let it = new IterableIterator<[K, V]>;
    for (let [k, v] of this._map) {
      yield v;
    }
  }

  public clone(): HashMap<V> {
    let ret = new HashMap<V>();
    for (let [k, v] of this._map) {
      ret.set_hashed(k,v);
    }
    return ret;
  }

  // public static construct<T>(arr: Array<T>): HashSet<T> {
  //   let ret: HashSet<T> = new HashSet<T>();
  //   for (let tx of arr) {
  //     ret.push(tx);
  //   }
  //   return ret;
  // }
  public set_hashed(k:number, v:V) {
    this._map.set(k, v);
  }
  public set(k:string, v:V) {
    this.set_hashed(this.hash(k), v);
  }
  public get(k:string): V {
    return this._map.get( this.hash(k));
  }
  public has(k: string): boolean {
    return this._map.has(this.hash(k));
  }
  // public entries(): IterableIterator<number> {
  //   return this._map.keys();
  // }
  public get length(): number {
    return this._map.size;
  }

}
export interface Dictionary<T> {
  //https://stackoverflow.com/questions/38213926/interface-for-associative-object-array-in-typescript
  [key: string]: T;
}
export class IVec2Map<K> {
  private map: Map<Int, Map<Int, K>> = new Map<Int, Map<Int, K>>();

  *[Symbol.iterator](): IterableIterator<[ivec2, K]> {
    //let it = new IterableIterator<[K, V]>;
    for (let [n0, m2] of this.map) {
      for (let [n1, k] of m2) {
        let r = new ivec2(n0, n1);
        yield [r, k];
      }
    }
  }

  public constructor() {
  }
  public get count(): Int {
    return this.map.size as Int;
  }
  public set(key: ivec2, value: K = null) {
    let m: Map<Int, K> = null;
    if (this.map.has(key.x)) {
      m = this.map.get(key.x)
    }
    else {
      m = new Map<Int, K>();
      this.map.set(key.x, m);
    }

    m.set(key.y, value);
  }
  public has(key: ivec2): boolean {
    if (this.map.has(key.x)) {
      let m: Map<Int, K> = this.map.get(key.x);
      return m.has(key.y);
    }
    else {
      return false;
    }
  }
  public get(key: ivec2): K {
    if (this.map.has(key.x)) {
      let m: Map<Int, K> = this.map.get(key.x);
      let ret = m.get(key.y);
      if (!ret) {
        //Map actually returns undefined so we want null to be consistent.
        return null;
      }
      return ret;
    }
    return null;
  }

}
export class IVec2Set extends IVec2Map<Int> {
}
export class HashSet<T> {
  private _map: Map<T, T> = new Map<T, T>();

  *[Symbol.iterator](): IterableIterator<T> {
    //let it = new IterableIterator<[K, V]>;
    for (let [k, v] of this._map) {
      yield k;
    }
  }

  public clone(): HashSet<T> {
    let ret = new HashSet<T>();
    for (let [k, v] of this._map) {
      ret.push(v);
    }
    return ret;
  }

  public static construct<T>(arr: Array<T>): HashSet<T> {
    let ret: HashSet<T> = new HashSet<T>();
    for (let tx of arr) {
      ret.push(tx);
    }
    return ret;
  }
  public push(t: T) {
    this._map.set(t, t);
  }
  public get(t: T): T {
    return this._map.get(t);
  }
  public has(t: T): boolean {
    return this._map.has(t);
  }
  public entries(): IterableIterator<T> {
    return this._map.keys();
  }
  public get length(): number {
    return this._map.size;
  }

}
export class MultiMap<K, V> /*implements Map<K,HashSet<V>> */ {

  private _map: Map<K, HashSet<V>> = new Map<K, HashSet<V>>();

  public constructor() {
  }
  *[Symbol.iterator](): IterableIterator<[K, V]> {
    //let it = new IterableIterator<[K, V]>;
    for (let [k, v] of this._map) {
      for (let val of v) {
        yield [k, val];
      }
    }
  }
  public static construct<K, V>(values: Array<Array<any>>): MultiMap<K, V> {
    let ret: MultiMap<K, V> = new MultiMap<K, V>();
    for (let entry of values) {
      if (Utils.isNotNullorUndefined(entry)) {
        if (entry.length === 2) {
          let key: K = entry[0] as K;
          let vals: V = entry[1] as V;
          ret.set(key, vals);
        }
        else {
          Globals.logError("Invalid multimap entry, too many items (must be 2).");
          Globals.debugBreak();
        }
      }
      else {
        //Sometimes I add a ,, on accident.  TS should catch this.
        Globals.logError("Invalid multimap entry, entry was null or undefined.");
        Globals.debugBreak();
      }
    }
    return ret;
  }
  public get(k: K): HashSet<V> {
    return this._map.get(k);
  }
  public keys(): IterableIterator<K> {
    return this._map.keys();
  }
  public set(k: K, v: V) {
    let h: HashSet<V> = this._map.get(k);

    if (!h) {
      h = new HashSet<V>();
      this._map.set(k, h);
    }

    h.push(v);
  }

}
export class RandomSet<T> {
  private _elements: MultiMap<number, T> = null;
  public get Elements(): MultiMap<number, T> { return this._elements; }
  private _normalized = false;

  public constructor() {
  }
  public select(): T {
    let ret: T = null;
    let threshold: number = 0;
    let rd = Random.float(0, 1);
    for (let [k, v] of this._elements) {

      threshold += k;
      if (rd < threshold) {
        ret = v;
        break;
      }
    }
    return ret;
  }
  public set(t: T, prob: number, renormalize: boolean = false) {
    if (!this._elements) {
      this._elements = new MultiMap<number, T>();
    }
    this._elements.set(prob, t);
    this._normalized = false;

    if (renormalize) {
      this.normalize();
    }
  }
  public normalize() {
    let newMap: MultiMap<number, T> = new MultiMap<number, T>();
    let sum = 0;
    let nElements = 0;
    if (!this._elements) {
      Globals.logWarn("sprite set had no elements to normalize.")
      return;
    }
    for (let [k, v] of this._elements) {
      sum += k;
      nElements++;
    }
    for (let [k, v] of this._elements) {
      let dk = k / sum;
      newMap.set(dk, v);
    }
    this._elements = newMap;
    this._normalized = true;
  }
}
export class Random {
  private static _rand: MersenneTwister = new MersenneTwister;
  private static _initialized: boolean = false;

  private static randomFloat01(): number {
    if (this._initialized == false) {
      this._initialized = true;
      this._rand.init_seed(new Date().getTime());
    }
    return this._rand.random();
  }
  public static float(min: number, max: number) {
    let f01: number = this.randomFloat01();
    let n2 = min + (max - min) * f01;
    return n2;
  }
  public static int(min: number, max: number): Int {
    let f01 = this.float(min, max);
    f01 = Math.round(f01) | 0;
    return f01 as Int;
  }
  public static randomColor(min: number = 0, max: number = 1): THREE.Color {
    let c: THREE.Color = new THREE.Color();
    c.r = this.float(min, max);
    c.g = this.float(min, max);
    c.b = this.float(min, max);
    return c;
  }
  public static randomVec4(min: number, max: number): vec4 {
    let v: vec4 = new vec4();
    v.x = Random.float(min, max);
    v.y = Random.float(min, max);
    v.z = Random.float(min, max);
    v.w = Random.float(min, max);
    return v;
  }
  public static randomVec3(min: number, max: number): vec3 {
    let v: vec3 = new vec3();
    v.x = Random.float(min, max);
    v.y = Random.float(min, max);
    v.z = Random.float(min, max);
    return v;
  }
  public static randomNormal(): vec3 {
    let v = this.randomVec3(-1, 1).normalize();
    return v;
  }
  public static bool() {
    //return this._random.random_incl() > 0.5;
    return Math.random() > 0.5;
  }
}
export class IAFloat {
  public Min: number = 0;
  public Max: number = 1;
  public constructor(min: number, max: number) {
    this.Min = min;
    this.Max = max;
  }
  public calc(): number {
    return Random.float(this.Min, this.Max);
  }
}
export class IAVec3 {
  public Min: vec3 = new vec3(0, 0, 0);
  public Max: vec3 = new vec3(1, 1, 1);
  public constructor(min: vec3, max: vec3) {
    this.Min = min;
    this.Max = max;
  }
  public calc(): vec3 {
    let r: vec3 = new vec3();
    r.x = Random.float(this.Min.x, this.Max.x);
    r.y = Random.float(this.Min.y, this.Max.y);
    r.z = Random.float(this.Min.z, this.Max.z);
    return r;
  }
}

/** 
 * @description Timers
 */
interface TimerTickFunction { (): void; };
export enum TimerState { Stopped, Running }
export class Timer {
  public Func: TimerTickFunction = null;
  public Interval: number = 10; //milliseconds
  private _t: number = 0; //milliseocnds
  private _state: TimerState = TimerState.Stopped;
  public constructor(interval: number, func: TimerTickFunction) {
    this.Func = func;
    this.Interval = interval;
    this.start();
  }
  public start() {
    this._state = TimerState.Running;
    this._t = this.Interval;
  }
  public pause() {
    this._state = TimerState.Stopped;
  }
  public stop() {
    this._state = TimerState.Stopped;
  }
  public update(dt: number) {
    if (this._state === TimerState.Running) {
      let idt: number = dt * 1000; // to millis

      //Incorrect, shoudl be looped. but we'll fix this later.
      this._t -= idt;
      if (this._t <= 0) {
        if (this.Func) {
          this.Func();
        }
        this._t = this.Interval;
      }
    }
  }
}

export class WaitTimer {
  private _time: number = 2;
  private _interval: number = 2;
  get interval(): number { return this._interval; }
  set interval(n: number) { this._interval = n; }
  get time(): number { return this._time; }
  get time01(): number { return 1 - this._time / this._interval; }

  public constructor(interval: number) {
    this._interval = this._time = interval;
  }
  public update(dt: number): boolean {
    if (this._time > 0) {
      this._time -= dt;
      if (this._time <= 0) {
        this._time = 0;
      }
    }
    return this.ready();
  }
  public trigger() {
    this._time = 0;
  }
  public ready(): boolean {
    return this._time <= 0;
  }
  public reset() {
    this._time = this._interval;
  }
}

/**
 * @description Events
 */
export type EventId = number;
export class GlobalEvent {
  public static readonly EventScreenChanged: EventId = 0;
  private _id: EventId;
  private _event: string = "";
  private _data: any = null;
  public get Event(): string { return this._event; }
  public get Id(): number { return this._id; }
  public get Data(): any { return this._data; }
  public constructor(event: string, id: number, data: any) {
    this._event = event;
    this._data = data;
    this._id = id;
  }
  public clone(data: any): GlobalEvent {
    let e = new GlobalEvent(this._event, this._id, data);
    return e;
  }

}
export class GlobalEventObject {
  private _bReceivingEvent: boolean = false; // prevent endless recursion.
  private _bSendingEvent: boolean = false; // prevent endless recursion.
  public _listeners: Map<GlobalEvent, Set<GlobalEventObject>> = new Map<GlobalEvent, Set<GlobalEventObject>>();
  public constructor() {
  }
  public receiveEvent(event: GlobalEvent) {
    // Override.
  }
  public sendEvent(id: EventId, data: any) {
    this._bSendingEvent = true;
    try {
      let e = this.get(id);
      if (e === null) {
        Globals.logError("Event id " + id + " was not registered.");
      }
      else {
        let new_e = e.clone(data);

        for (let [k, v] of this._listeners) {
          for (let L of v) {
            if (!L._bReceivingEvent) {
              L._bReceivingEvent = true;
              L.receiveEvent(new_e);
              L._bReceivingEvent = false;
            }
          }
        }
      }
    }
    catch (ex) {
      Globals.logError("Exception thrown while processing event.");
      throw ex;
    }
    finally {
      this._bSendingEvent = false;
    }
  }
  public register(eventId: EventId, listener: GlobalEventObject) {
    let ev = this.get(eventId);
    if (!ev) {
      let arr = this._listeners.get(ev);
      if (arr) {
        arr.add(listener);
      }
      else {
        Globals.logError("Event obj array was null.")
      }
    }
    else {
      Globals.logError("Could not find event ID " + eventId + " to register.")
    }
  }
  public addNotification(id: EventId, name: string = "") {
    if (!this.get(id)) {
      this._listeners.set(new GlobalEvent(name, id, null), new Set<GlobalEventObject>());
    }
    else {
      Globals.logWarn("Event " + name + " already created.")
    }
  }

  private get(id: number): GlobalEvent {
    let ret: GlobalEvent = null;
    for (let [k, v] of this._listeners) {
      if (k.Id === id) {
        ret = k;
        break;
      }
    }
    return ret;
  }
}
