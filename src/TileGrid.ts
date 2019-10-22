import { ivec2, vec2, vec3, vec4, mat3, mat4, ProjectedRay, Box2f, RaycastHit } from './Math';
import { Globals } from './Globals';
import { Atlas, Sprite25D, FDef } from './Main';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';
import world_data from './game_world.json';



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
      return m.get(key.y);
    }
    return null;
  }

}
class IVec2Set extends IVec2Map<Int> {
}

export class Res {
  public static readonly BorderTileId: Int = 0 as Int;
  public static readonly GuyTileId: Int = 19 as Int;
}
class TmxTileset {
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
  Door = 2,
  House = 3,
  Tree = 15,
  Monster_Grass = 17,
  Player = 19,
  Grass_Base = 46,
}
interface MakeTileFn { (): Sprite25D }
export class Tiles {
  private _tileMap: Map<TiledSpriteId, Sprite25D> = null;
  public getTile(id: TiledSpriteId): Sprite25D {
    return this._tileMap.get(id);
  }
  private addTile(x: MakeTileFn) {
    let tile = x();
    this._tileMap.set(tile.TiledSpriteId, tile);
  }
  public constructor(atlas: Atlas) {
    this._tileMap = new Map<TiledSpriteId, Sprite25D>();

    this.addTile(function () {
      let player = new Sprite25D("Player", TiledSpriteId.Player);
      player.Animation.addMultiTileAnimation("walk_down",
        FDef.default([[0, 1], [1, 1], [0, 1], [2, 1]]),
        0.7, atlas,
        new ivec2(1, 2));
      player.Animation.addMultiTileAnimation("walk_right",
        FDef.default([[3, 1], [4, 1], [3, 1], [5, 1]]),
        0.7, atlas,
        new ivec2(1, 2));
      player.Animation.addMultiTileAnimation("walk_left",
        FDef.default([[0, 3], [1, 3], [0, 3], [2, 3]]),
        0.7, atlas,
        new ivec2(1, 2));
      player.Animation.addMultiTileAnimation("walk_up",
        FDef.default([[6, 1], [7, 1], [6, 1], [8, 1]]),
        0.7, atlas,
        new ivec2(1, 2));
      return player;
    });

    //Testing grass..
    this.addTile(function () {
      let tile = new Sprite25D("Grass_Base", TiledSpriteId.Grass_Base);
      tile.Animation.addTileFrame(new ivec2(0, 0), atlas, new ivec2(1, 1));
      tile.Animation.addTileFrame(new ivec2(1, 0), atlas, new ivec2(1, 1));

      tile.IsCellTile = true; // This must be set for cell tiles to get populated.
      tile.updateQuadVerts();
      return tile;
    });


  }
}




export class PlatformLevel {
  public static readonly Border: Int = 0 as Int;
  public static readonly Background: Int = 1 as Int;
  public static readonly Midground: Int = 2 as Int;
  public static readonly Objects: Int = 3 as Int;
  public static readonly Foreground: Int = 4 as Int;
  public static readonly LayerCount: Int = 5 as Int;
  public static readonly EMPTY_TILE: Int = -1 as Int;

  private _atlas: Atlas = null;
  public get Atlas(): Atlas { return this._atlas; }

  //public World World { get; private set; }
  public Grid: TileGrid = null;;
  //public List<GameObject> GameObjects { get; private set; } = new List<GameObject>();
  //public List<GameObject> Projectiles { get; private set; } = new List<GameObject>();
  public Room: Room = null; //{ get; private set; }
  private NumFloodFill: Int = 0 as Int;


  private _tiles: Tiles = null;
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

    this.MakeRoom(this.PlayerStartXY);
  }

  public InitGenTileGrid() {
    this.GenTiles = new Array<Array<Array<Int>>>();
    for (let iRow = 0 as Int; iRow < this.MapHeightTiles; ++iRow) {
      this.GenTiles.push(new Array<Array<Int>>());

      for (let iCol = 0; iCol < this.MapWidthTiles; ++iCol) {
        let layers: Array<Int> = new Array<Int>();
        for (let iLayer = 0; iLayer < PlatformLevel.LayerCount; ++iLayer) {
          layers.push(PlatformLevel.EMPTY_TILE);
        }
        this.GenTiles[iRow].push(layers);// 3 layers **0 is out of bounds** so -1 is unset/null
      }
    }
  }
  public ParseGenTiles(map: TmxMap) {
    var version = map.version;

    let KeyTiles: Array<Int> = new Array<Int>();
    // List<int> KeyTiles = new List<int>
    // {
    //     World.Res.SlopeTile_BL               ,
    //     World.Res.SlopeTile_BR               ,
    //     World.Res.SlopeTile_TL               ,
    //     World.Res.SlopeTile_TR               ,
    //     World.Res.BorderTileId               ,
    //     World.Res.Sun_20Percent              ,
    //     World.Res.Sun_5Percent               ,
    //     World.Res.SavePointTileId            ,
    //     World.Res.Bombable_Tile_TileId       ,
    //     World.Res.FallThrough_Tile_TileId    ,
    //     World.Res.Water100TileId             ,
    //     World.Res.Water50TileId              ,
    //     World.Res.Lava100TileId              ,
    //     World.Res.Lava50TileId               ,
    //     World.Res.SavePointTileId,
    //     World.Res.SwitchButtonTileId  ,
    //     World.Res.SwitchDoorTileId   ,
    //     World.Res.SwitchConduitTileId,
    //     World.Res.Tar80TileId               ,
    // };
    let debug_invalid_tiles: Int = 0 as Int;

    for (let layer of map.layers) {
      let layerId: Int = -1 as Int;

      if (layer.name === ("Border")) { layerId = PlatformLevel.Border; }
      else if (layer.name === ("Foreground")) { layerId = PlatformLevel.Foreground; }
      else if (layer.name === ("Background")) { layerId = PlatformLevel.Background; }
      else if (layer.name === ("Midground")) { layerId = PlatformLevel.Midground; }
      else if (layer.name === ("Objects")) { layerId = PlatformLevel.Objects; }

      if (layerId == -1) {
        Globals.debugBreak();
      }
      else {
        let iTile
        for (let iTile = 0; iTile < layer.data.length; iTile++) {
          let tile: Int = layer.data[iTile];
          let tile_x: Int = ((iTile as Int) % (layer.width as Int)) as Int;
          let tile_y: Int = Math.floor(iTile / layer.width) as Int;

          if (tile === Res.GuyTileId) {
            //here is our start point, flood fill this area.
            this.PlayerStartXY.x = tile_x;
            this.PlayerStartXY.y = tile_y;
          }

          //Set to empty if we're not presetn.  Most tiles are 0, we use -1 for empty
          let val: Int = tile;
          if (tile === 0) {
            val = PlatformLevel.EMPTY_TILE;
          }
          else if (this._tiles.getTile(tile)) {
            //The tile is valid.
            let nnn = 0;
            nnn += 1;
          }
          else {
            val = PlatformLevel.EMPTY_TILE;
          }
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
  private MakeRoom(startxy: ivec2) {
    if (startxy.x != Number.MAX_SAFE_INTEGER as Int) {
      //Cleanup
      this.Room = null;
      this.Grid = null;
      //this.GameObjects = new List<GameObject>();

      //Find the boundary x/y of the map so we can make a grid
      this.Room = new Room();
      this.NumFloodFill = 0 as Int;

      this.FloodFillFromPointRecursive(startxy, this.Room);

      this.Room.Validate();

      //Make the grid
      this.Grid = new TileGrid(this, this.Room.WidthTiles, this.Room.HeightTiles, PlatformLevel.LayerCount);

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
  public FloodFillFromPointRecursive(pt_origin: ivec2, room: Room) {
    //Flood fill an area demarcated by the boundary.
    let toCheck: Array<ivec2> = new Array<ivec2>();
    toCheck.push(pt_origin);

    while (toCheck.length > 0) {
      this.NumFloodFill++;//degbug
      let pt: ivec2 = toCheck[toCheck.length - 1];

      toCheck.splice(toCheck.length - 1, 1);

      if (pt.x < 0 || pt.y < 0 || pt.x > this.MapWidthTiles || pt.y > this.MapHeightTiles) {
        return;
      }

      //Get the tile from the BORDER tile layer.
      let iTile: Int = this.TileXY(pt.x, pt.y, PlatformLevel.Border);

      if (room.Found.has(pt)) {
        //do nothing
      }
      else if (iTile === Res.BorderTileId) {
        if (!room.Border.has(pt)) {
          room.Border.set(pt);

          //Include Corner border tiles.
          //This is needed to see if a door that lies on a border corner is a portal door
          //otherwise we wouldn't include cornder borders in the flood fill
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(-1 as Int, 0 as Int)), room.Border);
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(1 as Int, 0 as Int)), room.Border);
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(0 as Int, -1 as Int)), room.Border);
          this.FloodFillAddNeighborBorder(pt.clone().add(new ivec2(0 as Int, 1 as Int)), room.Border);
        }
      }
      else if (this.DoorTilesLUT.indexOf(iTile) >= 0) {
        ///So the TODO here is to be able to figure out which side of the border the door is on
        if (!room.Border.has(pt)) {
          room.Doors.set(pt);
        }
      }
      else {
        //Add the found tile to the set of tiles.
        room.Found.set(pt);

        //Increase the room's boundbox
        if (pt.x < room.Min.x) { room.Min.x = pt.x; }
        if (pt.y < room.Min.y) { room.Min.y = pt.y; }
        if (pt.x > room.Max.x) { room.Max.x = pt.x; }
        if (pt.y > room.Max.y) { room.Max.y = pt.y; }

        //Were not a border, continue to search.
        toCheck.push(pt.clone().add(new ivec2(-1 as Int, 0 as Int)));
        toCheck.push(pt.clone().add(new ivec2(1 as Int, 0 as Int)));
        toCheck.push(pt.clone().add(new ivec2(0 as Int, -1 as Int)));
        toCheck.push(pt.clone().add(new ivec2(0 as Int, 1 as Int)));
      }
    }
  }
  public FloodFillAddNeighborBorder(v: ivec2, border: IVec2Set) {
    if (this.TileXY(v.x, v.y, PlatformLevel.Midground) == Res.BorderTileId) {
      if (!border.has(v)) {
        border.set(v);
      }
    }
  }
  public TileXY(col: Int, row: Int, layer: Int): Int {
    //**RETURN 0 FOR OUT OF BOUNDS
    if (row >= this.GenTiles.length || row < 0) {
      return 0 as Int;
    }
    if (col >= this.GenTiles[row].length || col < 0) {
      return 0 as Int;
    }
    if (layer >= this.GenTiles[row][col].length) {
      return 0 as Int;
    }
    return this.GenTiles[row][col][layer];
  }

}

export class TileBlock {
  public spriteRef: Sprite25D = null; //Reference to a Sprite25D, // Sprite for this block.  This also containst he TILE ID.  This is a REFERENCE to the tile.  Not a copy
  public frameIndex: Int = 0 as Int;
  //public float Health = 100; // Max Health is 100 for all blocks
  // public bool Blocking = false;
  // public bool CanMine = false;
  //  public bool CanBomb = false;
  //  public bool IsConduit = false;
  //  public bool FallThrough = false;
  // public SpriteEffects SpriteEffects = SpriteEffects.None;
  public Box: Box2f;   // So we need custom boxes for things like ladders, &c
  public get Pos(): vec2 { return this.Box.Min; }

  public SlopeTileId: Int = -1 as Int;//One of 4 slopes TL TR BL BR
  public IsSlope(): boolean { return this.SlopeTileId !== -1 as Int; }
}
export class Node {
  public Level: PlatformLevel;//{ get; private set; }
  //Node in a binary box tree - we don't use a quadtree because our grids are not square
  // public bool IsLeaf = false;
  public Box: Box2f;//{ get; set; } // Box, in Game-world pixels (not device pixels)
  public constructor(level: PlatformLevel, box: Box2f) { this.Level = level; this.Box = box; }
  public Children: Node[];
  public Cell: Cell = null;
}
//public enum WaterType { Water, Lava, Tar }
export class Cell {
  public Layers: Array<TileBlock>;

  //public vec4 WaterColor = new vec4(0.1f, 0.1f, 1.0f, 0.6f); 
  //public Water : number = 0; //= 0.0f;
  //public bool WaterTravelFrame = false;//
  //public bool WaterOnRight = false;
  //public bool WaterOnLeft = false;
  //public WaterType WaterType = WaterType.Lava;

  public Pos(): vec2 {
    return this.Parent.Box.Min.clone();
  }
  public Box(): Box2f {
    return this.Parent.Box;
  }
  // public DeviceBoundBox() : Box2f 
  // {
  //     let gridBox  : Box2f = new Box2f(
  //         this.Parent.Level.World.Screen.Viewport.WorldToDevice(Parent.Box.Min),
  //         this.Parent.Level.World.Screen.Viewport.WorldToDevice(Parent.Box.Max)
  //         );
  //     return gridBox;
  // }
  private _cellPos : ivec2;
  public Parent: Node;//{ get; private set; }
  public constructor(parent: Node, nLayers: number, cellPos : ivec2) {
    this._cellPos = cellPos;
    this.Parent = parent;
    this.Layers = new Array<TileBlock>(0);
    for (let i = 0; i < nLayers; ++i) {
      this.Layers.push(null);
    }
  }

  public LightColor: vec4 = new vec4(1, 1, 1, 1);   // the color
  public MarchFrame: Int = 0 as Int;
  public MarchFrameLight: Int = 0 as Int;
  //public float LightValue = 0;    // 0 - 100 = 0 = black 100 = transparent

  public GetTilePosLocal(): ivec2 {
    let dx: Int = Math.floor(this.Parent.Box.Min.x / this.Parent.Level.Atlas.TileWidthPixels) as Int;
    let dy: Int = Math.floor(this.Parent.Box.Min.y / this.Parent.Level.Atlas.TileHeightPixels) as Int;

    let v = new ivec2(dx as Int, dy as Int);

    return v;
  }
  // public  GetTilePosGlobal() : ivec2
  // {
  //     return this.Parent.Level.Room.Min + GetTilePosLocal();
  // }
}

export class Room {
  public RoomId: Int;
  public Min: ivec2 = new ivec2(0 as Int, 0 as Int);
  public Max: ivec2 = new ivec2(0 as Int, 0 as Int);
  //public List<ivec2> Found = new List<ivec2>();
  public Found: IVec2Set = new IVec2Set();
  public Border: IVec2Set = new IVec2Set();
  public Doors: IVec2Set = new IVec2Set();
  public WidthTiles: Int = -1 as Int;
  public HeightTiles: Int = -1 as Int;

  public Room() {
    this.Min.x = this.Min.y = Number.MAX_SAFE_INTEGER as Int;
    this.Max.x = this.Max.y = -Number.MAX_SAFE_INTEGER as Int;
  }
  public Validate() {
    if (this.Min.x > this.Max.x || this.Min.y > this.Max.y) {
      Globals.debugBreak();//System.Diagnostics.Debugger.Break();
    }
    if (this.Found.count === 0 as Int) {
      //Don't know whyt his would happen.
      Globals.debugBreak();//System.Diagnostics.Debugger.Break();
    }
    if (this.Found.count > 10000)//For the first area we're at 5670 so still, pretty big
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

}

export class TileGrid {
  public Level: PlatformLevel = null; //  { get; private set; }
  //  public Res Res { get; private set; }
  public RootNode: Node = null;//{ get; set; }
  public CellDict: IVec2Map<Cell> = new IVec2Map<Cell>();//Dictionary..
  private dbg_numnodes: Int = 0 as Int;
  private dbg_numcells: Int = 0 as Int;
  private NumLayers: Int = 0 as Int;

  // public TouchCell(c: Cell): boolean {
  //   if (c === null) {
  //     return false;
  //   }

  //   let gridBox: Box2f = new Box2f(
  //     Level.World.Screen.Viewport.WorldToDevice(c.Parent.Box.Min),
  //     Level.World.Screen.Viewport.WorldToDevice(c.Parent.Box.Max)
  //   );

  //   if (gridBox.ContainsPointInclusive(Level.World.Screen.Game.Input.LastTouch)) {
  //     return true;
  //   }

  //   return false;
  // }
  public constructor(level: PlatformLevel, tilesW: Int, tilesH: Int, nLayers: Int) {
    this.Level = level;
    //this.Res = Level.World.Res;
    this.NumLayers = nLayers;

    // this.CellDict = new Dictionary<ivec2, Cell>(new ivec2EqualityComparer());

    this.RootNode = new Node(level, this.GetGridExtents(tilesW, tilesH));
    this.DivideGrid(this.RootNode, 1 as Int);
  }

  private DivideGrid(parent: Node, iCallstack: Int) {
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
    let test = (wwww % this.Level.Atlas.TileWidthPixels) as Int;
    if (test !== 0) {
      Globals.debugBreak();
    }
    let test2 = (parent.Box.Height() % this.Level.Atlas.TileHeightPixels) as Int;
    if (test2 !== 0) {
      Globals.debugBreak();
    }

    let boxwh: vec2 = (parent.Box.Max.clone().sub(parent.Box.Min));
    let tilesXParent: Int = Math.floor(boxwh.x / this.Level.Atlas.TileWidthPixels) as Int;
    let tilesYParent: Int = Math.floor(boxwh.y / this.Level.Atlas.TileHeightPixels) as Int;
    let tilesXMid: Int = Math.floor((boxwh.x / this.Level.Atlas.TileWidthPixels) * 0.5) as Int;
    let tilesYMid: Int = Math.floor((boxwh.y / this.Level.Atlas.TileHeightPixels) * 0.5) as Int;

    if (tilesXParent === 1 as Int && tilesYParent === 1 as Int) {
      let cellPos: ivec2 = new ivec2(
        Math.floor(parent.Box.Min.x / this.Level.Atlas.TileWidthPixels) as Int,
        Math.floor(parent.Box.Min.y / this.Level.Atlas.TileHeightPixels) as Int
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
        let midx: number = parent.Box.Min.x + (tilesXMid as number) * this.Level.Atlas.TileWidthPixels;

        A = Box2f.construct(new vec2(parent.Box.Min.x, parent.Box.Min.y), new vec2(midx, parent.Box.Max.y));
        B = Box2f.construct(new vec2(midx, parent.Box.Min.y), new vec2(parent.Box.Max.x, parent.Box.Max.y));
      }
      else {
        let midy: number = parent.Box.Min.y + (tilesYMid as number) * this.Level.Atlas.TileHeightPixels;

        A = Box2f.construct(new vec2(parent.Box.Min.x, parent.Box.Min.y), new vec2(parent.Box.Max.x, midy));
        B = Box2f.construct(new vec2(parent.Box.Min.x, midy), new vec2(parent.Box.Max.x, parent.Box.Max.y));
      }

      parent.Children = new Array<Node>(2);
      parent.Children[0] = new Node(this.Level, A);
      parent.Children[1] = new Node(this.Level, B);

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
    for (let iLayer = 0; iLayer < PlatformLevel.LayerCount; iLayer++) {
      let iTileId: Int = this.Level.TileXY(cellPos.x, cellPos.y, iLayer as Int);
      
      if (iTileId !== PlatformLevel.EMPTY_TILE) {
        let tileSprite: Sprite25D = this.Level.Tiles.getTile(iTileId);

        if (c.Layers[iLayer] !== null) {
          //hmm... we already set this cell data. This shouldn't be ok.
          Globals.debugBreak();
        }
        else {
          c.Layers[iLayer] = new TileBlock();

          if (tileSprite.IsCellTile) {
            c.Layers[iLayer].spriteRef = tileSprite;
          }

        }
      }
    }

  }
  public GetCellForPointi(gridpos: ivec2): Cell {
    let v: vec2 = new vec2(
      (gridpos.x as number) * (this.Level.Atlas.TileWidthPixels as number) + (this.Level.Atlas.TileWidthPixels as number) * 0.5,
      (gridpos.y as number) * (this.Level.Atlas.TileHeightPixels as number) + (this.Level.Atlas.TileHeightPixels as number) * 0.5
    );
    return this.GetCellForPoint(v);
  }
  public GetCell(xy: ivec2): Cell {
    let cell: Cell = null;
    //Gets the cell at the grid pos
    cell = this.CellDict.get(xy);
    return cell;
  }
  public GetCellForPoint(pos: vec2): Cell {
    let parent: Node = this.RootNode;
    let ret: Cell = null;

    let nSanity: Int = 0 as Int;//Instead of using a while true loop we do this to prevent catastrophic failure
    while (nSanity < 1000) {
      for (let n of parent.Children) {
        if (n.Box.ContainsPointInclusive(pos)) {
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
    let b: Box2f = Box2f.construct(
      new vec2(0, 0),
      new vec2(tilesW * this.Level.Atlas.TileWidthPixels, tilesH * this.Level.Atlas.TileHeightPixels));
    return b;
  }
  public GetCellManifoldForBox(b: Box2f): Array<Cell> {
    let x: Int = Math.floor(b.Min.x / this.Level.Atlas.TileWidthPixels) as Int;
    let y: Int = Math.floor(b.Min.y / this.Level.Atlas.TileHeightPixels) as Int;

    let w: Int = Math.ceil(b.Width() / (this.Level.Atlas.TileWidthPixels as number)) as Int;
    let h: Int = Math.ceil(b.Height() / (this.Level.Atlas.TileHeightPixels as number)) as Int;

    let ret: Array<Cell> = new Array<Cell>();

    let vtmp: ivec2;
    for (let iy: Int = y; iy <= (y + h); ++iy) {
      for (let ix: Int = x; ix <= (x + w); ++ix) {
        vtmp = new ivec2(ix, iy);
        let c: Cell = this.CellDict.get(vtmp);
        ret.push(c);
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
      c.Parent.Box.Min.x + this.Level.Atlas.TileWidthPixels * (x as number) + this.Level.Atlas.TileWidthPixels * 0.5,
      c.Parent.Box.Min.y + this.Level.Atlas.TileHeightPixels * (y as number) + this.Level.Atlas.TileHeightPixels * 0.5);
    let ret: Cell = this.GetCellForPoint(pt);
    return ret;
  }
}
