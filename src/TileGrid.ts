import { ivec2, vec2, vec3, vec4, mat3, mat4, ProjectedRay, Box2f, RaycastHit } from './Math';
import { Globals } from './Globals';
import { Atlas } from './Main';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';
import world_data from './game_world.json';


class IVec2Map<K> {
  private map: Map<string, K> = new Map<string, K>();

  public constructor() {
  }
  public set(key: ivec2, val: K) {
    this.map.set(key.x.toString() + key.y.toString(), val);
  }
  public get(key: ivec2): K {
    return this.map.get(key.x.toString() + key.y.toString());
  }
  public has(key: ivec2): boolean {
    return this.map.has(key.x.toString() + key.y.toString());
  }
}
class IVec2Set {
  private map: Map<string, string> = new Map<string, string>();

  public constructor() {
  }
  public get count(): Int {
    return this.map.keys.length as Int;
  }
  public set(key: ivec2) {
    let s = key.x.toString() + key.y.toString();
    this.map.set(s, s);
  }
  // public get(key: ivec2): K {
  //   return this.map.get(key.x.toString() + key.y.toString());
  // }
  public has(key: ivec2): boolean {
    return this.map.has(key.x.toString() + key.y.toString());
  }
}

export class Res { 
  public static readonly BorderTileId : Int = 0 as Int;
}

export class PlatformLevel {
  public static readonly Background: Int = 0 as Int;
  public static readonly Midback: Int = 1 as Int;
  public static readonly Midground: Int = 2 as Int;
  public static readonly Foreground: Int = 3 as Int;
  public static readonly Liquid: Int = 4 as Int;
  public static readonly Conduit: Int = 5 as Int;
  public static readonly LayerCount: Int = 6 as Int;

  public static readonly EMPTY_TILE: Int = -1 as Int;


  private _atlas: Atlas = null;
  public get Atlas(): Atlas { return this._atlas; }

  //public World World { get; private set; }
  public Grid: TileGrid = null;;
  //public List<GameObject> GameObjects { get; private set; } = new List<GameObject>();
  //public List<GameObject> Projectiles { get; private set; } = new List<GameObject>();
  //public List<List<List<int>>> GenTiles;
  public Room: Room = null; //{ get; private set; }
  private NumFloodFill: Int = 0 as Int;

  public PlayerStartXY: ivec2 = new ivec2(Number.MAX_SAFE_INTEGER as Int, Number.MAX_SAFE_INTEGER as Int);

  public MapWidthTiles: Int = 0 as Int; //{ get; private set; }
  public MapHeightTiles: Int = 0 as Int; //{ get; private set; }
  private DoorTilesLUT : Array<Int> = new Array<Int>();

  public GenTiles : Array<Array<Array<Int>>> = new Array<Array<Array<Int>>>();

  public constructor(atlas: Atlas) {
    this._atlas = atlas;

    //let map = new TmxMap("Content\\" + level_name + ".tmx");

    this.MapWidthTiles = world_data.width as Int ; //map.Width;
    this.MapHeightTiles = world_data.height as Int; //map.Height;

    // //Create teh world data
    this.InitGenTileGrid();
    // ParseGenTiles(map);

    this.MakeRoom(this.PlayerStartXY);
  }
  public InitGenTileGrid()
  {
      this.GenTiles = new Array<Array<Array<Int>>>();
      for (let iRow = 0 as Int; iRow < this.MapHeightTiles; ++iRow)
      {
        this.GenTiles.push(new Array<Array<Int>>());

          for (let iCol = 0; iCol < this.MapWidthTiles; ++iCol)
          {
              let layers :Array<Int> = new Array<Int>();
              for (let iLayer = 0; iLayer < PlatformLevel.LayerCount; ++iLayer) { 
                layers.push(PlatformLevel.EMPTY_TILE);
               }
              this.GenTiles[iRow].push(layers);// 3 layers **0 is out of bounds** so -1 is unset/null
          }
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

      let iTile: Int = this.TileXY(pt.x, pt.y, PlatformLevel.Midground);

      if (room.Found.has(pt)) {

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
        room.Found.set(pt);

        if (pt.x < room.Min.x) { room.Min.x = pt.x; }
        if (pt.y < room.Min.y) { room.Min.y = pt.y; }
        if (pt.x > room.Max.x) { room.Max.x = pt.x; }
        if (pt.y > room.Max.y) { room.Max.y = pt.y; }

        //Were not a border.
        toCheck.push(pt.clone().add(new ivec2(-1 as Int, 0 as Int)));
        toCheck.push(pt.clone().add(new ivec2(1 as Int, 0 as Int)));
        toCheck.push(pt.clone().add(new ivec2(0 as Int, -1 as Int)));
        toCheck.push(pt.clone().add(new ivec2(0 as Int, 1 as Int)));
      }
    }
  }
  public FloodFillAddNeighborBorder(v : ivec2 ,  border : IVec2Set)
  {
      if(this.TileXY(v.x, v.y, PlatformLevel.Midground) == Res.BorderTileId)
      {
          if (!border.has(v))
          {
              border.set(v);
          }
      }
  }
  public TileXY(col : Int, row : Int, layer : Int) : Int
  {
      //**RETURN 0 FOR OUT OF BOUNDS
      if (row >= this.GenTiles.length || row < 0)
      {
          return 0 as Int;
      }
      if (col >= this.GenTiles[row].length || col < 0)
      {
          return 0 as Int;
      }
      if (layer >= this.GenTiles[row][col].length)
      {
          return 0 as Int;
      }
      return this.GenTiles[row][col][layer];
  }

}

export class TileBlock {
  // public Tile Tile = null; // Sprite for this block.  This also containst he TILE ID.  This is a REFERENCE to the tile.  Not a copy
  // public Sprite Sprite = null;
  // public int FrameIndex = 0;
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
    return this.Parent.Box.Min;
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
  public Parent: Node;//{ get; private set; }
  public constructor(parent: Node, nLayers: number) {
    this.Parent = parent;
    this.Layers = new Array<TileBlock>(nLayers);
    for (let i = 0; i < nLayers; ++i) {
      this.Layers.push(null);
    }
  }

  public LightColor: vec4 = new vec4(1, 1, 1, 1);   // the color
  public MarchFrame: Int = 0 as Int;
  public MarchFrameLight: Int = 0 as Int;
  //public float LightValue = 0;    // 0 - 100 = 0 = black 100 = transparent

  public GetTilePosLocal(): ivec2 {
    let dx: number = this.Parent.Box.Min.x / this.Parent.Level.Atlas.TileWidth;
    let dy: number = this.Parent.Box.Min.y / this.Parent.Level.Atlas.TileHeight;

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
    this.WidthTiles = this.Max.x - this.Min.x + 1 as Int;
    this.HeightTiles = this.Max.y - this.Min.y + 1 as Int;
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
    this.DivideGrid(this.RootNode);
  }

  private DivideGrid(parent: Node) {
    if (parent.Box.Width() <= 0) {
      Globals.debugBreak();
      //System.Diagnostics.Debugger.Break();
    }
    if (parent.Box.Height() <= 0) {
      Globals.debugBreak();
      //System.Diagnostics.Debugger.Break();
    }

    //Double sanity - we must always be evenly divisible by tiles.
    if (((parent.Box.Width()) as Int % this.Level.Atlas.TileWidth) != 0) {
      Globals.debugBreak();
    }
    if ((parent.Box.Height() as Int % this.Level.Atlas.TileHeight) != 0) {
      Globals.debugBreak();
    }

    let boxwh: vec2 = (parent.Box.Max.clone().sub(parent.Box.Min));
    let tilesXParent: Int = ((boxwh.x / this.Level.Atlas.TileWidth)) as Int;
    let tilesYParent: Int = ((boxwh.y / this.Level.Atlas.TileHeight)) as Int;
    let tilesXMid: Int = ((boxwh.x / this.Level.Atlas.TileWidth) * 0.5) as Int;
    let tilesYMid: Int = ((boxwh.y / this.Level.Atlas.TileHeight) * 0.5) as Int;

    if (tilesXParent === 1 as Int && tilesYParent === 1 as Int) {
      let cellPos: ivec2 = new ivec2(
        (parent.Box.Min.x / this.Level.Atlas.TileWidth) as Int,
        (parent.Box.Min.y / this.Level.Atlas.TileHeight) as Int
      );
      parent.Cell = new Cell(parent, this.NumLayers);

      if (this.CellDict.has(cellPos)) {
        //Error: cell already found
        Globals.debugBreak();
      }
      else {
        this.CellDict.set(cellPos, parent.Cell);
      }

      this.dbg_numcells++;
    }
    else {
      let A: Box2f = null;
      let B: Box2f = null;

      if (tilesXParent > tilesYParent) {
        let midx: number = parent.Box.Min.x + tilesXMid as number * this.Level.Atlas.TileWidth;

        A = Box2f.construct(new vec2(parent.Box.Min.x, parent.Box.Min.y), new vec2(midx, parent.Box.Max.y));
        B = Box2f.construct(new vec2(midx, parent.Box.Min.y), new vec2(parent.Box.Max.x, parent.Box.Max.y));
      }
      else {
        let midy: number = parent.Box.Min.y + tilesYMid as number * this.Level.Atlas.TileHeight;

        A = Box2f.construct(new vec2(parent.Box.Min.x, parent.Box.Min.y), new vec2(parent.Box.Max.x, midy));
        B = Box2f.construct(new vec2(parent.Box.Min.x, midy), new vec2(parent.Box.Max.x, parent.Box.Max.y));
      }

      parent.Children = new Array<Node>(2);
      parent.Children[0] = new Node(this.Level, A);
      parent.Children[1] = new Node(this.Level, B);

      this.dbg_numnodes = roundToInt(this.dbg_numnodes as number + 2);

      let i = 0;
      for (let n of parent.Children) {
        this.DivideGrid(n);
        i++;
      }
    }


  }
  public GetCellForPointi(gridpos: ivec2): Cell {
    let v: vec2 = new vec2(
      (gridpos.x as number) * (this.Level.Atlas.TileWidth as number) + (this.Level.Atlas.TileWidth as number) * 0.5,
      (gridpos.y as number) * (this.Level.Atlas.TileHeight as number) + (this.Level.Atlas.TileHeight as number) * 0.5
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
  public GetSurroundingCells(c: Cell, corners: boolean = false): Cell[] {
    //If corners is false, you skip the corners of the 3x3 grid

    let n: Cell[] = new Array<Cell>(9);
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
      new vec2(tilesW * this.Level.Atlas.TileWidth, tilesH * this.Level.Atlas.TileHeight));
    return b;
  }
  public GetCellManifoldForBox(b: Box2f): Array<Cell> {
    let x: Int = (b.Min.x / this.Level.Atlas.TileWidth) as Int;
    let y: Int = (b.Min.y / this.Level.Atlas.TileHeight) as Int;

    let w: Int = Math.ceil(b.Width() / (this.Level.Atlas.TileWidth as number)) as Int;
    let h: Int = Math.ceil(b.Height() / (this.Level.Atlas.TileHeight as number)) as Int;

    let ret: Array<Cell> = new Array<Cell>();

    let vtmp: ivec2;
    for (let iy: Int = y; iy <= (y + h); ++iy) {
      for (let ix: Int = x; ix <= (x + w); ++ix) {
        vtmp = new ivec2(ix, iy);
        let c: Cell = null;
        if (this.CellDict.get(vtmp)) {
          // #if DEBUG
          //           if (ret.Contains(c)) {

          //     //SANITY CHEC
          //     System.Diagnostics.Debugger.Break();
          //   }
          // #endif
          ret.push(c);
        }
        else {
          // int n = 0;
          // n++;
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
      c.Parent.Box.Min.x + this.Level.Atlas.TileWidth * (x as number) + this.Level.Atlas.TileWidth * 0.5,
      c.Parent.Box.Min.y + this.Level.Atlas.TileHeight * (y as number) + this.Level.Atlas.TileHeight * 0.5);
    let ret: Cell = this.GetCellForPoint(pt);
    return ret;
  }
}
