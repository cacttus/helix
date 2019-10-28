import { Color, EqualStencilFunc } from 'three';
import { ivec2, vec2, vec3, vec4, mat3, mat4, ProjectedRay, Box2f, RaycastHit } from './Math';
import { Globals } from './Globals';
import { Atlas, Sprite25D, FDef, SpriteFrame, Tiling, Character, Direction4Way, SpriteProp, CollisionHandling, Phyobj25D, HandGesture, SpriteAnimationData } from './Main';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';
import world_data from './game_world.json';
import { Random } from './Base';

class IVec2Map<K> {
  private map: Map<Int, Map<Int, K>> = new Map<Int, Map<Int, K>>();

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
class IVec2Set extends IVec2Map<Int> {
}
class HashSet<T> {
  private _map: Map<T, T> = new Map<T, T>();

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
class MultiValueDictionary<K, V>  {
  private _map: Map<K, HashSet<V>> = new Map<K, HashSet<V>>();
  public constructor() {
  }
  public static construct<K, V>(values: Array<Array<any>>): MultiValueDictionary<K, V> {
    let ret: MultiValueDictionary<K, V> = new MultiValueDictionary<K, V>();
    for (let entry of values) {
      if (Globals.isNotNullorUndefined(entry)) {
        if (entry.length === 2) {
          let key: K = entry[0] as K;
          let vals: V = entry[1] as V;
          ret.add(key, vals);
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
  public add(k: K, v: V) {
    let h: HashSet<V> = this._map.get(k);

    if (!h) {
      h = new HashSet<V>();
      this._map.set(k, h);
    }

    h.push(v);
  }

}
class TmxTileset {
  //Tileset in Tiled.
  public columns: Int;//":6,
  public firstgid: Int;//":1,
  public image: Int; //"..\/..: Int;//\/miner\/Core\/Content\/mintiles-16x16.png",
  public imageheight: Int;//":512,
  public imagewidth: Int;//":103,
  public margin: Int;//":1,
  public name: Int;//:"WorldTiles",
  public spacing: Int;//":1,
  public tilecount: Int;//":180,
  public tileheight: Int;//":16,
  public tilewidth: Int;//":16
}
class TmxLayer {
  //Layer in Tiled
  public data: Array<Int>;//:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  public height: Int;//":44,
  public id: Int;//":6,
  public name: string;//":"Border",
  public opacity: number;//":1,
  public type: string;//":"tilelayer",
  public visible: boolean;//":true,
  public width: Int;//":60,
  public x: Int;//":0,
  public y: Int;//":0
}
class TmxMap {
  //This is a map in Tiled
  public width: Int; //":60    
  public height: Int;
  public infinite: boolean;
  public nextlayerid: Int;//":9,
  public nextobjectid: Int;//":1,
  public orientation: string;//":"orthogonal",
  public renderorder: string; //":"right-down",
  public tiledversion: string;//":"1.2.0",
  public tilewidth: Int; //":16,
  public tileheight: Int;//":16,
  public type: string; //":"map",
  public version: string; //":1.2,\
  public layers: Array<TmxLayer>;
  public tilesets: Array<TmxTileset>;///":[
}

export enum TiledSpriteId {
  //Note: the actual exported Tiled ID is +1 greater than the 0 based offset in the program.
  None = 0,
  Border = 1,
  Tree = 2,
  House = 3,
  Player = 4,
  Monster_Grass = 5,
  Grass_Base = 6,
  Rock = 7,
  Door = 8,
  Hole = 9
}
export enum TileLayer {
  /* THESE MUST BE IN ORDER TO GET CELL BLOCKS ARRAY */
  DebugBackground = -1,
  Border = 0,
  Background = 1,
  Midground = 2,
  Objects = 3,
  Foreground = 4,
  LayerCount = 5,
  Unset = 6, // Special layer type indicating that the layer of this
}

interface MakeTileFn { (): Sprite25D }
export class Tiles {
  //This is the definitions for all tiles in the game.
  //If we get Monogame Toolkit to work... we can eventually do away with this.
  private _tileMap: Map<TiledSpriteId, Sprite25D> = null;

  public constructor(atlas: Atlas) {
    this._tileMap = new Map<TiledSpriteId, Sprite25D>();
    let that = this;

    this.addTile(function () {
      let player = new Character(atlas, "Player", TiledSpriteId.Player, TileLayer.Objects);
      that.addCharacterAnimation(player, atlas,
        [[3, 1], [4, 1], [3, 1], [5, 1]],//left
        [[3, 1], [4, 1], [3, 1], [5, 1]],//right
        [[6, 1], [7, 1], [6, 1], [8, 1]],//up
        [[0, 1], [1, 1], [0, 1], [2, 1]]//down
      );

      player.face(Direction4Way.Down);

      player.IsCellTile = false; // This must be set for cell tiles to get populated.
      player.calcQuadVerts();

      return player;
    });

    //Testing grass..
    this.addTile(function () {
      let tile = new Sprite25D(atlas, "Grass_Base", TiledSpriteId.Grass_Base, TileLayer.Unset);
      tile.Animation.addTileFrame(new ivec2(0, 0), atlas);
      tile.Animation.addTileFrame(new ivec2(1, 0), atlas);
      tile.Animation.addTileFrame(new ivec2(2, 0), atlas);
      tile.Animation.addTileFrame(new ivec2(3, 0), atlas);
      tile.Animation.addTileFrame(new ivec2(4, 0), atlas);

      tile.Tiling = Tiling.Random;
      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      return tile;
    });

    //9,0
    this.addTile(function () {
      // let props = [
      //   new SpriteProp(new ivec2(0,0), TileLayer.Foreground, CollisionHandling.None),
      //   new SpriteProp(new ivec2(1,0), TileLayer.Foreground, CollisionHandling.None),
      //   new SpriteProp(new ivec2(0,1), TileLayer.Objects, CollisionHandling.CollideWithLayerObjects),
      //   new SpriteProp(new ivec2(1,1), TileLayer.Objects, CollisionHandling.CollideWithLayerObjects),
      // ]

      let tile = new Sprite25D(atlas, "Tree", TiledSpriteId.Tree, TileLayer.Unset);
      let off_x = 9;
      let off_y = 0;
      for (let j = 0; j < 2; ++j) {
        for (let i = 0; i < 2; ++i) {
          tile.Animation.addTileFrame(new ivec2(off_x + i, off_y + j), atlas);
        }
      }
      tile.Tiling = Tiling.SetEvenOdd2x2;
      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      tile.CollisionHandling = CollisionHandling.CollideWithLayerObjects;
      tile.Gesture = HandGesture.Poke;

      return tile;
    });
    this.addTile(function () {
      let tile = new Sprite25D(atlas, "House", TiledSpriteId.House, TileLayer.Unset);
      let off_x = 12;
      let off_y = 0;
      for (let j = 0; j < 3; ++j) {
        for (let i = 0; i < 3; ++i) {
          tile.Animation.addTileFrame(new ivec2(off_x + i, off_y + j), atlas);
        }
      }
      tile.Tiling = Tiling.Set3x3Block;
      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      tile.CollisionHandling = CollisionHandling.CollideWithLayerObjects;
      return tile;
    });
    this.addTile(function () {
      let tile = new Sprite25D(atlas, "Rock", TiledSpriteId.Rock, TileLayer.Unset);
      tile.Animation.addTileFrame(new ivec2(9, 3), atlas);
      tile.Tiling = Tiling.Single;
      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      tile.CollisionHandling = CollisionHandling.CollideWithLayerObjects;
      tile.Gesture = HandGesture.Grab;
      return tile;
    });
    this.addTile(function () {
      let tile = new Sprite25D(atlas, "Hole", TiledSpriteId.Hole, TileLayer.Unset);
      tile.Animation.addTileFrame(new ivec2(10, 3), atlas);
      tile.Tiling = Tiling.Single;
      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      tile.CollisionHandling = CollisionHandling.CollideWithLayerObjects;
      return tile;
    });
    this.addTile(function () {
      let tile = new Sprite25D(atlas, "Monster_Grass", TiledSpriteId.Monster_Grass, TileLayer.Unset);
      tile.Animation.addTileFrame(new ivec2(11, 3), atlas);
      tile.Animation.addTileFrame(new ivec2(12, 3), atlas);
      tile.Tiling = Tiling.Single;
      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      tile.CollisionHandling = CollisionHandling.CollideWithLayerObjects;
      tile.Gesture = HandGesture.Poke;


      // tile.PreCollisionFunction = function (this_block: TileBlock) {
      //   this.Layer = TileLayer.Objects;
      //   this_block.FrameIndex = toInt(0); // reset
      // }
      // tile.CollisionFunction = function (this_block: TileBlock, thisObj: Phyobj25D, other: Phyobj25D) {
      //   //Move the grass into the foreground and change its sprite
      //   if (this_block) {
      //     this_block.Layer = TileLayer.Foreground;
      //     this_block.FrameIndex = toInt(1); // reset
      //   }
      // }
      return tile;
    });

  }
  public getTile(id: TiledSpriteId): Sprite25D {
    return this._tileMap.get(id);
  }
  private addTile(x: MakeTileFn) {
    let tile = x();
    this._tileMap.set(tile.TiledSpriteId, tile);
  }
  private addCharacterAnimation(char: Character, atlas: Atlas, left: any, right: any, up: any, down: any) {

    //This places the char's head above things in the world, and also makes it not collidable.
    let props = [
      new SpriteProp(new ivec2(0, 0), TileLayer.Foreground, CollisionHandling.None),
      new SpriteProp(new ivec2(0, 1), TileLayer.Objects, CollisionHandling.CollideWithLayerObjects)
    ]

    char.Animation.addTiledAnimation(Character.getAnimationNameForMovementDirection(Direction4Way.Down),
      FDef.default(down),
      0.7, atlas,
      new ivec2(1, 2), true, props);
    char.Animation.addTiledAnimation(Character.getAnimationNameForMovementDirection(Direction4Way.Right),
      FDef.default(right),
      0.7, atlas,
      new ivec2(1, 2), true, props);
    char.Animation.addTiledAnimation(Character.getAnimationNameForMovementDirection(Direction4Way.Left),
      FDef.default(left, true),
      0.7, atlas,
      new ivec2(1, 2), true, props);
    char.Animation.addTiledAnimation(Character.getAnimationNameForMovementDirection(Direction4Way.Up),
      FDef.default(up),
      0.7, atlas,
      new ivec2(1, 2), true, props);
  }

}
export class MasterMap {
  //The entire game world in one Tiled data file.  
  //We flood fill rooms bounded by border tiles to create map areas.
  //It's a fun way to make seamless game areas and makes it easy to connect areas since they're just right next to each other.
  public static readonly EMPTY_TILE: Int = -1 as Int;

  private _atlas: Atlas = null;
  private _tiles: Tiles = null;
  public _area: MapArea = null; //{ get; private set; }

  public get Area(): MapArea { return this._area; }
  public get Atlas(): Atlas { return this._atlas; }
  public get Tiles(): Tiles { return this._tiles; }

  public PlayerStartXY: ivec2 = new ivec2(Number.MAX_SAFE_INTEGER as Int, Number.MAX_SAFE_INTEGER as Int);
  public MapWidthTiles: Int = 0 as Int; //{ get; private set; }
  public MapHeightTiles: Int = 0 as Int; //{ get; private set; }
  private DoorTilesLUT: Array<Int> = new Array<Int>();
  public GenTiles: Array<Array<Array<Int>>> = new Array<Array<Array<Int>>>();

  public constructor(atlas: Atlas) {
    this._atlas = atlas;

    let map = this.ParseTmxJson(JSON.stringify(world_data));
    this.MapWidthTiles = map.width as Int;
    this.MapHeightTiles = map.height as Int;

    //Create Tiles.
    this._tiles = new Tiles(atlas);

    this.InitGenTileGrid();

    this.ParseGenTiles(map);




    this.debugPrintGenTileInfo();
    this.MakeMapArea(this.PlayerStartXY);
  }
  private debugPrintGenTileInfo() {
    if (Globals.isDebug()) {
      //debug gent iles.
      let mapFound: Map<Int, Int> = new Map<Int, Int>();
      let s: string = "";
      let del: string = "";
      for (let iRow = 0 as Int; iRow < this.MapHeightTiles; ++iRow) {
        for (let iCol = 0; iCol < this.MapWidthTiles; ++iCol) {
          for (let iLayer = 0; iLayer < TileLayer.LayerCount; ++iLayer) {
            let t = this.GenTiles[iRow][iCol][iLayer];
            s += del + this.GenTiles[iRow][iCol][iLayer];
            del = ",";
            mapFound.set(t, t);
          }
        }
      }
      s = " >>>> " + s;
      for (let [k, v] of mapFound) {
        s = k + " " + s;
      }
      s = "tiles: " + s;
      console.log(s);
    }
  }
  public InitGenTileGrid() {
    this.GenTiles = new Array<Array<Array<Int>>>();
    for (let iRow = 0 as Int; iRow < this.MapHeightTiles; ++iRow) {
      this.GenTiles.push(new Array<Array<Int>>());

      for (let iCol = 0; iCol < this.MapWidthTiles; ++iCol) {
        let layers: Array<Int> = new Array<Int>();
        for (let iLayer = 0; iLayer < TileLayer.LayerCount; ++iLayer) {
          layers.push(MasterMap.EMPTY_TILE);
        }
        this.GenTiles[iRow].push(layers);// 3 layers **0 is out of bounds** so -1 is unset/null
      }
    }
  }
  private dbg_count = 0;
  public ParseGenTiles(map: TmxMap) {
    //Parse the Tiled map and translate the Tile IDs into IDs we can use
    //Basically all this does is set '0' to '-1' for empty tile.
    //
    //We don't use zero, just because it's likely to become confusing.
    let debug_invalid_tiles: Int = 0 as Int;

    for (let layer of map.layers) {
      let layerId: Int = toInt(-1);

      if (layer.name === ("Border")) { layerId = toInt(TileLayer.Border); }
      else if (layer.name === ("Foreground")) { layerId = toInt(TileLayer.Foreground); }
      else if (layer.name === ("Background")) { layerId = toInt(TileLayer.Background); }
      else if (layer.name === ("Midground")) { layerId = toInt(TileLayer.Midground); }
      else if (layer.name === ("Objects")) { layerId = toInt(TileLayer.Objects); }

      if (layerId === -1) {
        Globals.debugBreak();
      }
      else {
        for (let iTile = 0; iTile < layer.data.length; iTile++) {
          let tile: Int = layer.data[iTile];
          let tile_x: Int = toInt(toInt(iTile) % toInt(layer.width));
          let tile_y: Int = toInt(iTile / layer.width);

          if (tile === TiledSpriteId.Grass_Base) {
            this.dbg_count++;
          }
          //Flip the map upside down.
          //  tile_y = (this.MapHeightTiles - tile_y) as Int;

          if (tile === TiledSpriteId.Player) {
            //here is our start point, flood fill this area.
            this.PlayerStartXY.x = tile_x;
            this.PlayerStartXY.y = tile_y;
          }

          //Set to empty if we're not presetn.  Most tiles are 0, we use -1 for empty
          let val: Int = tile;
          if (tile === 0) {
            val = MasterMap.EMPTY_TILE;
          }
          // else if (this._tiles.getTile(tile)) {
          //   //The tile is valid.
          //   let nnn = 0;
          //   nnn += 1;
          // }

          // else {
          //   val = MasterMap.EMPTY_TILE;
          // }
          this.TrySetGenTile(tile_x, tile_y, layerId, val);
        }
      }

    }

    if (debug_invalid_tiles > 0) {
      Globals.logWarn("Found " + debug_invalid_tiles + " invalid tiles..");
    }
  }
  private ParseTmxJson(json: string): TmxMap {
    let ret: TmxMap = JSON.parse(json);
    return ret;
  }
  private TrySetGenTile(iCol: Int, iRow: Int, iLayer: Int, iTile: Int) {
    if (iRow < 0 || iRow >= this.MapHeightTiles) {
      return;
    }
    if (iCol < 0 || iCol >= this.MapWidthTiles) {
      return;
    }
    try {
      this.GenTiles[iRow][iCol][iLayer] = iTile;//already set, but debug here
    }
    catch (ex) {
      Globals.debugBreak();
    }
  }
  private MakeMapArea(startxy: ivec2) {
    if (startxy.x != Number.MAX_SAFE_INTEGER as Int) {
      //Cleanup
      //this.Grid = null;

      //Find the boundary x/y of the map so we can make a grid
      this._area = new MapArea(this, startxy);

      //MUST COME BEFORE GENERATE GAME OBJECTS
      // GenerateDoors();

      // //Generate objects  / Doors
      // GenerateWorldObjects();

      // MakeWallTorches();
    }
    else {
      //YOU DIDNT SET THE PLAYER ANYWHERE
      //Failed to find the guy tile.
      Globals.debugBreak();
    }
  }

  public worldPointToMapPoint(v_in:vec3) : vec3 {
    //Converts an OpenGL coordinate system point to a point relative to the MasterMap origin.
    let v : vec3 = new vec3(
      v_in.x,
      -v_in.y,
      v_in.z
    );
    return v;
  }
  public project(p1:vec3, p2:vec3, normal:vec3, position:vec3) : vec3{
    //Projects the given line segment onto this world
    //Input: OpenGL World coordinates
    //Returns OpenGL World coordinates.
    

        //(n.p+d) = (a+tb)
        let n = normal;
        let d = -(n.dot(position));
        let t: number = -(n.dot(p1) + d) / ((p2.clone().sub(p1)).dot(n));
        let ret = p1.clone().add(p2.clone().sub(p1).multiplyScalar(t));
        return ret;

  }
  
}
export class MapArea {
  //A piece of a platform map that was found by flood filling to border tiles.
  public RoomId: Int;
  public Min: ivec2 = new ivec2(0 as Int, 0 as Int);
  public Max: ivec2 = new ivec2(0 as Int, 0 as Int);
  public Tiles: IVec2Set = new IVec2Set(); //All of the tile locations found in this room relative to the Master Map
  public Border: IVec2Set = new IVec2Set(); //Border Tile Locations
  public Doors: IVec2Set = new IVec2Set(); // Door Tile Locations
  public WidthTiles: Int = -1 as Int;
  public HeightTiles: Int = -1 as Int;
  public Grid: TileGrid = null;
  public Map: MasterMap = null;

  public constructor(map: MasterMap, startxy: ivec2) {
    this.Min.x = this.Min.y = Number.MAX_SAFE_INTEGER as Int;
    this.Max.x = this.Max.y = -Number.MAX_SAFE_INTEGER as Int;

    this.Map = map;
    this.debug_numfloodfill = 0 as Int;

    this.FloodFillFromPointRecursive(startxy);
    this.Validate();

    //Make the grid
    this.Grid = new TileGrid(this, this.WidthTiles, this.HeightTiles, TileLayer.LayerCount as Int);
  }
  public Validate() {
    if (this.Min.x > this.Max.x || this.Min.y > this.Max.y) {
      Globals.debugBreak();//System.Diagnostics.Debugger.Break();
    }
    if (this.Tiles.count === 0 as Int) {
      //Don't know whyt his would happen.
      Globals.debugBreak();//System.Diagnostics.Debugger.Break();
    }
    if (this.Tiles.count > 10000)//For the first area we're at 5670 so still, pretty big
    {
      //Level is Too Big
      //You probably forgot a portal or delimiter wall somewhere.
      Globals.debugBreak();// System.Diagnostics.Debugger.Break();
    }

    //include the border for doors
    //Plus 1 - the magnitue doesn't include the end tile
    //Max.x += 1;
    //Max.y += 1;

    //Subtract 1 for the outside border.
    this.WidthTiles = (this.Max.x - this.Min.x + (1 as Int)) as Int;
    this.HeightTiles = (this.Max.y - this.Min.y + (1 as Int)) as Int;
  }
  private debug_numfloodfill = 0;
  public FloodFillFromPointRecursive(pt_origin: ivec2) {
    //Flood fill an area demarcated by the boundary.
    let toCheck: Array<ivec2> = new Array<ivec2>();
    toCheck.push(pt_origin);

    while (toCheck.length > 0) {
      this.debug_numfloodfill++;//degbug
      let pt: ivec2 = toCheck[toCheck.length - 1];

      toCheck.splice(toCheck.length - 1, 1);

      if (pt.x < 0 || pt.y < 0 || pt.x > this.Map.MapWidthTiles || pt.y > this.Map.MapHeightTiles) {
        return;
      }

      //Get the tile from the BORDER tile layer.
      let iTile: Int = this.TileXY_World(pt.x, pt.y, TileLayer.Border as Int);
      let iTile_Door: Int = this.TileXY_World(pt.x, pt.y, TileLayer.Objects as Int);

      if (this.Tiles.has(pt)) {
        //do nothing
      }
      else if (iTile === TiledSpriteId.Border) {
        if (!this.Border.has(pt)) {
          this.Border.set(pt);

          //Include Corner border tiles.
          //This is needed to see if a door that lies on a border corner is a portal door
          //otherwise we wouldn't include cornder borders in the flood fill
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(-1 as Int, 0 as Int)), this.Border);
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(1 as Int, 0 as Int)), this.Border);
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(0 as Int, -1 as Int)), this.Border);
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(0 as Int, 1 as Int)), this.Border);
        }
      }
      else if (iTile_Door === TiledSpriteId.Door) {//this.DoorTilesLUT.indexOf(iTile) >= 0) {  Old method
        ///So the TODO here is to be able to figure out which side of the border the door is on
        if (!this.Border.has(pt)) {
          this.Doors.set(pt);
        }
      }
      else {
        //Add the found tile to the set of tiles.
        this.Tiles.set(pt);

        //Increase the room's boundbox
        if (pt.x < this.Min.x) { this.Min.x = pt.x; }
        if (pt.y < this.Min.y) { this.Min.y = pt.y; }
        if (pt.x > this.Max.x) { this.Max.x = pt.x; }
        if (pt.y > this.Max.y) { this.Max.y = pt.y; }

        //Were not a border, continue to search.
        toCheck.push(pt.clone().add(new ivec2(-1 as Int, 0 as Int)));
        toCheck.push(pt.clone().add(new ivec2(1 as Int, 0 as Int)));
        toCheck.push(pt.clone().add(new ivec2(0 as Int, -1 as Int)));
        toCheck.push(pt.clone().add(new ivec2(0 as Int, 1 as Int)));
      }
    }
  }
  public FloodFillAddNeighborBorder(v: ivec2, border: IVec2Set) {
    if (this.TileXY_World(v.x, v.y, TileLayer.Midground as Int) == TiledSpriteId.Border) {
      if (!border.has(v)) {
        border.set(v);
      }
    }
  }
  public TileXY_World(col: Int, row: Int, layer: Int): Int {
    //**RETURN 0 FOR OUT OF BOUNDS
    if (row >= this.Map.GenTiles.length || row < 0) {
      return 0 as Int;
    }
    if (col >= this.Map.GenTiles[row].length || col < 0) {
      return 0 as Int;
    }
    if (layer >= this.Map.GenTiles[row][col].length) {
      return 0 as Int;
    }
    return this.Map.GenTiles[row][col][layer];
  }
}
export class TileGrid {
  //This is the node BVH tree of the Master Map
  //public Level: MasterMap = null; //  { get; private set; }
  public Area: MapArea = null;
  public RootNode: BvhNode = null;//{ get; set; }
  public CellDict: IVec2Map<Cell> = new IVec2Map<Cell>();//Dictionary..
  private dbg_numnodes: Int = 0 as Int;
  private dbg_numcells: Int = 0 as Int;
  private NumLayers: Int = 0 as Int;
  public Patterns: TilePatterns = null;

  public constructor(area: MapArea, tilesW: Int, tilesH: Int, nLayers: Int) {
    this.Area = area;
    this.NumLayers = nLayers;

    this.Patterns = new TilePatterns();

    this.RootNode = new BvhNode(area, this.GetGridExtents(tilesW, tilesH));
    this.DivideGrid(this.RootNode, 1 as Int);
  }
  private DivideGrid(parent: BvhNode, iCallstack: Int) {
    if (iCallstack > 100) {
      Globals.debugBreak();
    }
    if (parent.Box.Width() <= 0) {
      Globals.debugBreak();
      //System.Diagnostics.Debugger.Break();
    }
    if (parent.Box.Height() <= 0) {
      Globals.debugBreak();
      //System.Diagnostics.Debugger.Break();
    }

    //Double sanity - we must always be evenly divisible by tiles.
    let wwww = parent.Box.Width();
    let test = (wwww % this.Area.Map.Atlas.TileWidthR3) as Int;
    if (test !== 0) {
      Globals.debugBreak();
    }
    let test2 = (parent.Box.Height() % this.Area.Map.Atlas.TileHeightR3) as Int;
    if (test2 !== 0) {
      Globals.debugBreak();
    }

    let boxwh: vec2 = (parent.Box.Max.clone().sub(parent.Box.Min));
    let tilesXParent: Int = toInt(boxwh.x / this.Area.Map.Atlas.TileWidthR3);
    let tilesYParent: Int = toInt(boxwh.y / this.Area.Map.Atlas.TileHeightR3);
    let tilesXMid: Int = toInt((boxwh.x / this.Area.Map.Atlas.TileWidthR3) * 0.5);
    let tilesYMid: Int = toInt((boxwh.y / this.Area.Map.Atlas.TileHeightR3) * 0.5);

    if (tilesXParent === 1 as Int && tilesYParent === 1 as Int) {
      let cellPos: ivec2 = new ivec2(
        toInt(parent.Box.Min.x / this.Area.Map.Atlas.TileWidthR3),
        toInt(parent.Box.Min.y / this.Area.Map.Atlas.TileHeightR3)
      );
      parent.Cell = new Cell(parent, this.NumLayers, cellPos);

      if (this.CellDict.has(cellPos)) {
        //Error: cell already found
        Globals.debugBreak();
      }
      else {
        this.CellDict.set(cellPos, parent.Cell);
      }

      this.setCellData(parent.Cell, cellPos);

      this.dbg_numcells++;
    }
    else {
      let A: Box2f = null;
      let B: Box2f = null;

      if (tilesXParent > tilesYParent) {
        let midx: number = parent.Box.Min.x + (tilesXMid as number) * this.Area.Map.Atlas.TileWidthR3;

        A = Box2f.construct(new vec2(parent.Box.Min.x, parent.Box.Min.y), new vec2(midx, parent.Box.Max.y));
        B = Box2f.construct(new vec2(midx, parent.Box.Min.y), new vec2(parent.Box.Max.x, parent.Box.Max.y));
      }
      else {
        let midy: number = parent.Box.Min.y + (tilesYMid as number) * this.Area.Map.Atlas.TileHeightR3;

        A = Box2f.construct(new vec2(parent.Box.Min.x, parent.Box.Min.y), new vec2(parent.Box.Max.x, midy));
        B = Box2f.construct(new vec2(parent.Box.Min.x, midy), new vec2(parent.Box.Max.x, parent.Box.Max.y));
      }

      parent.Children = new Array<BvhNode>(2);
      parent.Children[0] = new BvhNode(this.Area, A);
      parent.Children[1] = new BvhNode(this.Area, B);

      this.dbg_numnodes = roundToInt(this.dbg_numnodes as number + 2);

      let i = 0;
      for (let n of parent.Children) {
        this.DivideGrid(n, iCallstack + 1 as Int);
        i++;
      }
    }

  }
  private setCellData(c: Cell, cellPos: ivec2) {
    //Set the Cell Data.  This is where the love happens.
    for (let iLayer = 0; iLayer < TileLayer.LayerCount; iLayer++) {
      let iTileId: Int = this.Area.TileXY_World(cellPos.x, cellPos.y, iLayer as Int);

      if (iTileId !== MasterMap.EMPTY_TILE && iTileId !== TiledSpriteId.Border) {
        let tileSprite: Sprite25D = this.Area.Map.Tiles.getTile(iTileId);

        if (!tileSprite) {
          Globals.logError("Could not find tiled sprite for tile ID " + iTileId);
          if (iTileId > 1000) {
            //Globals.debugBreak();
          }
        }
        else if (tileSprite.IsCellTile) {
          c.Blocks.push(new TileBlock());
          c.Blocks[c.Blocks.length - 1].SpriteRef = tileSprite;
          c.Blocks[c.Blocks.length - 1].Layer = iLayer;
          c.Blocks[c.Blocks.length - 1].AnimationData = tileSprite.Animation.TileData;
          c.Blocks[c.Blocks.length - 1].FrameIndex = this.getSpriteTileFrame(c.CellPos_World.x, c.CellPos_World.y, toInt(iLayer as number), tileSprite, iTileId);
        }
      }
    }

  }
  // public GetCellForPointi(gridpos: ivec2): Cell {
  //   let v: vec2 = new vec2(
  //     (gridpos.x as number) * (this.Area.Map.Atlas.TileWidthR3 as number) + (this.Area.Map.Atlas.TileWidthR3 as number) * 0.5,
  //     (gridpos.y as number) * (this.Area.Map.Atlas.TileHeightR3 as number) + (this.Area.Map.Atlas.TileHeightR3 as number) * 0.5
  //   );
  //   return this.GetCellForPoint(v);
  // }
  public GetCell(xy: ivec2): Cell {
    let cell: Cell = null;
    //Gets the cell at the grid pos
    cell = this.CellDict.get(xy);
    return cell;
  }

  public GetCellForPoint_WorldR3(pos: vec3): Cell {
    return this.GetCellForPoint_World(new vec2(pos.x, pos.y));
  }
  public GetCellForPoint_World(pos: vec2): Cell {
    let parent: BvhNode = this.RootNode;
    let ret: Cell = null;

    let nSanity: Int = 0 as Int;//Instead of using a while true loop we do this to prevent catastrophic failure
    while (nSanity < 1000) {
      for (let n of parent.Children) {
        if (n.Box.ContainsPoint_TL_INCLUSIVE_BR_EXCLUSIVE(pos)) {
          if (n.Cell != null) {
            ret = n.Cell;
            nSanity = 1005 as Int;
          }
          else {
            parent = n;
          }

          break;
        }
      }

      nSanity++;
    }
    return ret;
  }
  public GetSurroundingCells(c: Cell, corners: boolean = false): Array<Cell> {
    //If corners is false, you skip the corners of the 3x3 grid
    let n: Array<Cell> = new Array<Cell>(9);
    n[4] = c;
    if (c == null) { return n; }

    for (let j: Int = -1 as Int; j <= 1; ++j) {
      for (let i: Int = -1 as Int; i <= 1; ++i) {
        if (i === 0 && j === 0) {
          //Skip center
        }
        else if (corners == false && ((i == -1 && j == -1) || (i == 1 && j == 1) || (i == -1 && j == 1) || (i == 1 && j == -1))) {
          //Skip corners if they're false
        }
        else {
          let ind: Int = ((j + 1) * 3 + (i + 1)) as Int;
          n[ind] = this.GetNeighborCell(c, i, j);
        }
      }
    }
    return n;
  }
  public GetGridExtents(tilesW: Int, tilesH: Int): Box2f {
    let tw = this.Area.Map.Atlas.TileWidthR3;
    let th = this.Area.Map.Atlas.TileHeightR3;

    let b: Box2f = Box2f.construct(
      new vec2(this.Area.Min.x, this.Area.Min.y),
      new vec2(this.Area.Min.x * tw + tilesW * tw, this.Area.Min.y * th + tilesH * th));
    return b;
  }
  public GetCellManifoldForBox(b: Box2f): Array<Cell> {
    let x: Int = Math.floor(b.Min.x / this.Area.Map.Atlas.TileWidthR3) as Int;
    let y: Int = Math.floor(b.Min.y / this.Area.Map.Atlas.TileHeightR3) as Int;

    let w: Int = (Math.ceil(b.Width() / this.Area.Map.Atlas.TileWidthR3) + 1) as Int;
    let h: Int = (Math.ceil(b.Height() / this.Area.Map.Atlas.TileHeightR3) + 1) as Int;

    let ret: Array<Cell> = new Array<Cell>();

    let vtmp: ivec2;
    for (let iy: Int = y; iy <= (y + h); ++iy) {
      for (let ix: Int = x; ix <= (x + w); ++ix) {
        vtmp = new ivec2(ix, iy);
        let c: Cell = this.CellDict.get(vtmp);
        if (c === null) {
          let n = 0; n++;
        }
        else if (c === undefined) {
          let n = 0; n++;
        }
        else {
          ret.push(c);
        }
      }
    }

    return ret;
  }
  public GetCellAbove(c: Cell): Cell {
    return this.GetNeighborCell(c, 0 as Int, -1 as Int);
  }
  public GetNeighborCell(c: Cell, x: Int, y: Int): Cell {
    //X increases right
    //Y increases down
    if (c == null) {
      return null;
    }
    let pt: vec2 = new vec2(
      c.Parent.Box.Min.x + this.Area.Map.Atlas.TileWidthR3 * (x as number) + this.Area.Map.Atlas.TileWidthR3 * 0.5,
      c.Parent.Box.Min.y + this.Area.Map.Atlas.TileHeightR3 * (y as number) + this.Area.Map.Atlas.TileHeightR3 * 0.5);
    let ret: Cell = this.GetCellForPoint_World(pt);
    return ret;
  }
  public getSpriteTileFrame(x: Int, y: Int, layer: Int, tileSprite: Sprite25D, tileId: Int) {
    let ret: Int = toInt(0);
    if (tileSprite.Tiling === Tiling.Random) {
      ret = Random.int(0, tileSprite.Animation.TileData.KeyFrames.length - 1);
    }
    else if (tileSprite.Tiling === Tiling.SetEvenOdd2x2) {
      ret = this.GetTileIndexEvenOdd2x2(x, y);
    }
    else if (tileSprite.Tiling === Tiling.Set3x3Block) {
      ret = this.GetTileIndex3x3Block(x, y, layer, tileId, HashSet.construct<Int>([tileId]), true);
    }
    else if (tileSprite.Tiling === Tiling.Set3x3Seamless) {
      ret = this.GetTileIndex3x3Seamless(x, y, layer, tileId, HashSet.construct<Int>([tileId]), true);
    }
    else if (tileSprite.Tiling === Tiling.Single) {
      ret = 0 as Int;
    }
    else {
      Globals.logError("Invalid tiling type for setCellData()");
    }

    if (ret >= tileSprite.Animation.TileData.KeyFrames.length) {
      Globals.logError("Invalid keyframe " + ret + " for tile sprite " + tileSprite.Name);
      Globals.debugBreak();
      ret = toInt(0);
    }

    return ret;
  }

  public GetTileIndexEvenOdd2x2(col: Int, row: Int): Int {
    let x: boolean = (col % 2) === 0;
    let y: boolean = (row % 2) === 0;

    if (x && y) {
      return toInt(0);
    }
    else if (!x && y) {
      return toInt(1);
    }
    else if (x && !y) {
      return toInt(2);
    }
    else if (!x && !y) {
      return toInt(3);
    }
  }
  public GetTileIndex3x3Block(col: Int, row: Int, layer: Int, tileId: Int, seamless_ids: HashSet<Int>, bContinue: boolean = true): Int {
    return this.GetTileIndex3x3(col, row, layer, tileId, seamless_ids, bContinue, true);
  }
  public GetTileIndex3x3Seamless(col: Int, row: Int, layer: Int, tileId: Int, seamless_ids: HashSet<Int>, bContinue: boolean = true): Int {
    return this.GetTileIndex3x3(col, row, layer, tileId, seamless_ids, bContinue, false);
  }
  public GetTileIndex3x3(col: Int, row: Int, layer: Int, tileId: Int, seamless_ids: HashSet<Int>, bContinue: boolean = true, block: boolean = true): Int {
    //bContinue - Continue the tiling when we hit the level border.
    //The tiles should all be the same in the spritesheett
    //**Important note: Seamless ID's MUST contain the tile at least. 
    if (!seamless_ids || seamless_ids.length === 0) {
      Globals.logError("Seamless ids of generated tiles  must at least contain the tile id.");
      Globals.debugBreak();
    }

    //Create a boolean array
    let arr: Array<boolean> = new Array<boolean>(9);
    for (let j: number = -1; j <= 1; ++j) {
      for (let i: number = -1; i <= 1; ++i) {

        let ind: number = (j + 1) * 3 + (i + 1);

        let cell_x: number = col + i;
        let cell_y: number = row + j;

        //Out of bounds check
        if (this.Area.Tiles.has(new ivec2(cell_x, cell_y)) === false) {
          //Seam the level border
          arr[ind] = true;
        }
        else {
          let txy: Int = this.Area.TileXY_World(toInt(cell_x), toInt(cell_y), layer);
          if (txy === 0 && bContinue) {
            txy = tileId;  //continue outside the level border, 0 is null/no tile for TILED tiles.
          }

          //Else find the tile in the seamless tile id's
          arr[ind] = seamless_ids.has(txy);
        }
      }
    }

    let pat: Int = this.CrankPattern(block ? this.Patterns.TilePatterns3x3Block : this.Patterns.TilePatterns3x3Seamless, arr, toInt(9), toInt(7), toInt(4));
    if (pat === 21) {
      let n: Int = toInt(0);
      n++;
    }
    return pat;
  }
  public CrankPattern(list: MultiValueDictionary<Int, Array<Int>>, arr: boolean[], PatternTileCount: Int, Defaultvalue: Int, CenterPat: Int): Int {
    //This algorithm matches an input pattern of tiles, to the a configured pattern, to generate
    //a sprite.  This is essentially an automatic tiling algorithm.
    //Loop arr, match with every pattern in "list" and return the corresponding key
    //Center pat is the center index - the pattern we ignore  = 4 for 3x3 and 1 for 1x3 or 3x1
    if (arr.length !== PatternTileCount) {
      //Error
      Globals.debugBreak();
    }

    let ret: Int = Defaultvalue;
    for (let frame of list.keys()) {
      let values: HashSet<Array<Int>> = null;

      values = list.get(frame);
      if (values) {
        for (const pat of values.entries()) {
          if (pat.length !== PatternTileCount) {
            //Must have 9 tiles in the pattern.
            Globals.debugBreak();
          }

          let match: boolean = true;
          for (let iPat = 0; iPat < PatternTileCount; ++iPat) {
            if (iPat === CenterPat) {
              //Don't test the center square. That's what we're calculating.
              continue;
            }

            if (pat[iPat] === 2) {
              //2 = Don't care.  
            }
            else if ((pat[iPat] === 1) !== arr[iPat]) {
              match = false;
              break;
            }
          }

          if (match === true) {
            return frame;
          }
        }

      }
    }

    return Defaultvalue;
  }

}
export class TileBlock {
  private _spriteRef: Sprite25D = null; //Reference to a Sprite25D, // Sprite for this block.  This also containst he TILE ID.  This is a REFERENCE to the tile.  Not a copy
  private _frameIndex: Int = 0 as Int;//The index of the frame that this sprite
  private _layer: TileLayer = TileLayer.Unset;
  private _animationData : SpriteAnimationData = null;
  
  public get AnimationData(): SpriteAnimationData { return this._animationData; }
  public set AnimationData(x: SpriteAnimationData) { this._animationData = x; }

  public get FrameIndex(): Int { return this._frameIndex; }
  public set FrameIndex(x: Int) { this._frameIndex = x; }

  public get SpriteRef(): Sprite25D { return this._spriteRef; }
  public set SpriteRef(x: Sprite25D) { this._spriteRef = x; }

  public get Layer(): TileLayer { return this._layer; }
  public set Layer(x: TileLayer) { this._layer = x; }

  // public SpriteEffects SpriteEffects = SpriteEffects.None;
  public Box: Box2f;   // So we need custom boxes for things like ladders, &c

  public get Pos(): vec2 { return this.Box.Min; }

  public SlopeTileId: Int = -1 as Int;//One of 4 slopes TL TR BL BR
  public IsSlope(): boolean { return this.SlopeTileId !== -1 as Int; }
}
export class BvhNode {
  //A BVH node in the Master Map
  //public Level: MasterMap;//{ get; private set; }
  public Area: MapArea = null;
  //Node in a binary box tree - we don't use a quadtree because our grids are not square
  public Children: BvhNode[];
  public Cell: Cell = null;
  public Box: Box2f;//{ get; set; } // Box, in Game-world pixels (not device pixels)
  public constructor(area: MapArea, box: Box2f) {
    this.Area = area;
    this.Box = box;
  }

}
//public enum WaterType { Water, Lava, Tar }
export class Cell {
  //This is a leaf node of the MapArea class, a single cell with fixed w/h
  private _cellPosWorld: ivec2;
  public _parent: BvhNode = null;//{ get; private set; }
  public Blocks: Array<TileBlock> = new Array<TileBlock>();

  public DebugColor: Color = null;
  public DebugVerts: Array<vec3> = new Array<vec3>();
  public static DebugFrame: SpriteFrame = null; // thisis just for debug

  public removeBlock(block:TileBlock):boolean{
    for(let bi=this.Blocks.length-1; bi>=0; bi--){
      if(this.Blocks[bi]===block){
        this.Blocks.splice(bi,1);
        return true;
      }
    }
    return false;
  }
  public getOrderedBlockArrayTopDown(): Array<TileBlock> {
    //Returns the array of all blocks ordered from Front[0] to Back[n]
    //If this tile has multiple blocks on the same layer, then the order is the order in which they exist on the cell.
    let ret: Array<TileBlock> = new Array<TileBlock>();
    for (let iLayer = TileLayer.LayerCount - 1; iLayer >= 0; --iLayer) {
      for (let block of this.Blocks) {
        if (block.Layer === iLayer as TileLayer) {
          ret.push(block);
        }
      }
    }
    return ret;
  }

  //Cell position relative to the master map.
  public get CellPos_World(): ivec2 { return this._cellPosWorld; }
  //Cell position relative to the map area min/max boundary.
  public get CellPos_Area(): ivec2 {
    let iv = new ivec2(
      this._cellPosWorld.x - this._parent.Area.Min.x,
      this._cellPosWorld.y - this._parent.Area.Min.y);
    return iv;
  }

  public get Parent(): BvhNode { return this._parent; }
  public set Parent(x: BvhNode) { this._parent = x; }

  public get BoundBox_World(): Box2f {
    return this.Parent.Box;
  }
  public get TilePosR3(): vec3 {
    //The position in R3 Tile Space
    let dx = this._cellPosWorld.x;
    let dy = this._cellPosWorld.y; // Flipping y to turn into OpenGL coordinates.
    let dz = 0;
    return new vec3(dx, dy, dz);
  }
  public constructor(parent: BvhNode, nLayers: number, cellPos: ivec2) {
    this._cellPosWorld = cellPos;
    this.Parent = parent;
    let g = (this._cellPosWorld.y / 44);
    let e = (this._cellPosWorld.x / 60);
    this.DebugColor = new Color(g, 0, e);//= Random.randomColor(0.4, 1.0);
  }

  // public  GetTilePosGlobal() : ivec2
  // {
  //     return this.Parent.Level.Room.Min + GetTilePosLocal();
  // }
  // public DeviceBoundBox() : Box2f 
  // {
  //     let gridBox  : Box2f = new Box2f(
  //         this.Parent.Level.World.Screen.Viewport.WorldToDevice(Parent.Box.Min),
  //         this.Parent.Level.World.Screen.Viewport.WorldToDevice(Parent.Box.Max)
  //         );
  //     return gridBox;
  // }

}

class TilePatterns {
  //Tile Patterns.
  //center of the 3x3 - the tile in question
  //values:
  //0 - no tile is present
  //1 - a tile in this tileset is present
  //2 - ANY tile in this layer is present
  //Using numbers and converting to int later. Down the road... BigInt
  public TilePatterns3x3Seamless: MultiValueDictionary<Int, Array<Int>> = null;
  public TilePatterns3x3Block: MultiValueDictionary<Int, Array<Int>> = null;

  private TilePatterns3x3Block_n: MultiValueDictionary<number, Array<number>> = null;
  private TilePatterns3x3Seamless_n: MultiValueDictionary<number, Array<number>> = null;

  public constructor() {
    this.set();
    //Convert numbered patterns to integer.
    //Why?  because we want to use Int type but having a toInt() on every number is hell.
    this.TilePatterns3x3Seamless = this.nPatToI(this.TilePatterns3x3Seamless_n);
    this.TilePatterns3x3Block = this.nPatToI(this.TilePatterns3x3Block_n);
  }
  private nPatToI(input: MultiValueDictionary<number, Array<number>>): MultiValueDictionary<Int, Array<Int>> {
    //Simple method to 
    let ret: MultiValueDictionary<Int, Array<Int>> = new MultiValueDictionary<Int, Array<Int>>();

    for (let k of input.keys()) {
      let nv: HashSet<Array<number>> = input.get(k);
      for (let nvx of nv.entries()) {
        let arrToI: Array<Int> = new Array<Int>();
        for (let ni = 0; ni < nvx.length; ++ni) {
          arrToI.push(toInt(nvx[ni]));
        }
        ret.add(toInt(k), arrToI);
      }
    }

    return ret;
  }
  private set() {
    this.TilePatterns3x3Seamless_n = MultiValueDictionary.construct<number, Array<number>>([
      [0, new Array<number>(
        2, 0, 2,
        0, 1, 1,
        2, 1, 1)],
      [1, new Array<number>(
        2, 0, 2,
        1, 1, 1,
        1, 1, 1)],
      [2, new Array<number>(
        2, 0, 2,
        1, 1, 0,
        1, 1, 2)],
      [3, new Array<number>(
        0, 0, 0,
        0, 1, 0,
        2, 1, 2)],
      [3, new Array<number>(
        2, 0, 2,
        0, 1, 0,
        2, 1, 2)],
      [4, new Array<number>(
        2, 0, 2,
        0, 1, 1,
        2, 0, 2)],
      [5, new Array<number>(
        2, 0, 2,
        1, 1, 0,
        2, 0, 2)],

      //Row2
      [6, new Array<number>(
        2, 1, 1,
        0, 1, 1,
        2, 1, 1)],
      [7, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        1, 1, 1)],
      [8, new Array<number>(
        1, 1, 2,
        1, 1, 0,
        1, 1, 2)],
      [9, new Array<number>(
        2, 1, 2,
        0, 1, 0,
        2, 0, 2)],
      [10, new Array<number>(
        1, 1, 0,
        1, 1, 1,
        1, 1, 1)],
      [11, new Array<number>(
        0, 1, 1,
        1, 1, 1,
        1, 1, 1)],
      //Row 3
      [12, new Array<number>(
        2, 1, 1,
        0, 1, 1,
        2, 0, 2)],
      [13, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        2, 0, 2)],

      [14, new Array<number>(
        1, 1, 2,
        1, 1, 0,
        2, 0, 2)],


      [15, new Array<number>( //*This goes with 4 and 5
        2, 0, 2,
        1, 1, 1,
        2, 0, 2)],

      [16, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        0, 1, 0)],

      //Too many combos, use 2
      [17, new Array<number>(
        2, 1, 2,
        0, 1, 0,
        2, 1, 2)],

      //Row 4
      [18, new Array<number>(
        2, 1, 0,
        0, 1, 1,
        2, 1, 1)],
      [19, new Array<number>(
        0, 1, 2,
        1, 1, 0,
        1, 1, 2)],
      [20, new Array<number>(
        2, 1, 0,
        0, 1, 1,
        2, 1, 0)],

      [21, new Array<number>(
        0, 1, 2,
        1, 1, 0,
        0, 1, 2)],

      [22, new Array<number>(
        1, 1, 0,
        1, 1, 1,
        1, 1, 0)],
      [23, new Array<number>(
        0, 1, 1,
        1, 1, 1,
        0, 1, 1)],
      //Row 5
      [24, new Array<number>(
        2, 0, 2,
        1, 1, 1,
        1, 1, 0)],
      [25, new Array<number>(
        2, 0, 2,
        1, 1, 1,
        0, 1, 1)],
      [26, new Array<number>(
        2, 0, 2,
        1, 1, 1,
        0, 1, 0)],

      [27, new Array<number>(
        2, 1, 0,
        0, 1, 1,
        2, 0, 2)],

      [28, new Array<number>(
        0, 1, 2,
        1, 1, 0,
        2, 0, 2)],

      [29, new Array<number>(
        2, 0, 2,
        0, 1, 0,
        2, 0, 2)],


      //Rpw 6
      [30, new Array<number>(
        2, 0, 2,
        0, 1, 1,
        2, 1, 0)],
      [31, new Array<number>(
        2, 0, 2,
        1, 1, 0,
        0, 1, 2)],

      [32, new Array<number>(
        0, 1, 0,
        1, 1, 1,
        0, 1, 0)],
      [33, new Array<number>(
        2, 1, 1,
        0, 1, 1,
        2, 1, 0)],
      [34, new Array<number>(
        1, 1, 2,
        1, 1, 0,
        0, 1, 2)],
      [35, new Array<number>(
        0, 1, 0,
        1, 1, 1,
        2, 0, 2)],

      //rOW 7
      [36, new Array<number>(
        0, 1, 0,
        1, 1, 1,
        1, 1, 0)],
      [37, new Array<number>(
        0, 1, 0,
        1, 1, 1,
        0, 1, 1)],
      [38, new Array<number>(
        0, 1, 1,
        1, 1, 1,
        2, 0, 2)],

      [39, new Array<number>(
        1, 1, 0,
        1, 1, 1,
        2, 0, 2)],
      [40, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        1, 1, 0)],
      [41, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        0, 1, 1)],
      //Row 8
      [42, new Array<number>(
        1, 1, 0,
        1, 1, 1,
        0, 1, 0)],
      [43, new Array<number>(
        0, 1, 1,
        1, 1, 1,
        0, 1, 0)],
      [44, new Array<number>(
        0, 1, 0,
        1, 1, 1,
        1, 1, 1)],
      [49, new Array<number>(
        0, 1, 2,
        1, 1, 1,
        2, 1, 0)],
      [48, new Array<number>(
        2, 1, 0,
        1, 1, 1,
        0, 1, 2)],

    ]);

    this.TilePatterns3x3Block_n = MultiValueDictionary.construct<number, Array<number>>([
      [0, new Array<number>(
        0, 0, 0,
        0, 1, 1,
        0, 1, 1)],
      [1, new Array<number>(
        0, 0, 0,
        1, 1, 1,
        1, 1, 1)],
      [2, new Array<number>(
        0, 0, 0,
        1, 1, 0,
        1, 1, 0)],
      [3, new Array<number>(
        0, 1, 1,
        0, 1, 1,
        0, 1, 1)],
      [4, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        1, 1, 1)],
      [5, new Array<number>(
        1, 1, 0,
        1, 1, 0,
        1, 1, 0)],
      [6, new Array<number>(
        0, 1, 1,
        0, 1, 1,
        0, 0, 0)],
      [7, new Array<number>(
        1, 1, 1,
        1, 1, 1,
        0, 0, 0)],
      [8, new Array<number>(
        1, 1, 0,
        1, 1, 0,
        0, 0, 0)],
    ]);
  }

}