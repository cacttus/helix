import { Globals } from "Globals";
import { vec2 } from './Math';

export class Room {
  private RoomId: number;
  private Min: vec2;
  private Max: vec2;
  private Found: vec2[];
  private Border: vec2[];
  private Doors: vec2[];
  private WidthTiles: number;
  private HeightTiles: number;

  public constructor() {
    this.Min.x = this.Min.y = Number.MAX_SAFE_INTEGER;
    this.Max.x = this.Max.y = -Number.MAX_SAFE_INTEGER;
  }
  public Validate() {
    if (this.Min.x > this.Max.x || this.Min.y > this.Max.y) {
      Globals.debugBreak();
    }
    if (this.Found.length == 0) {
      //Don't know whyt his would happen.
      Globals.debugBreak();
    }
    if (this.Found.length > 10000)//For the first area we're at 5670 so still, pretty big
    {
      //Level is Too Big
      //You probably forgot a portal or delimiter wall somewhere.
      Globals.debugBreak();
    }

    //include the border for doors
    //Plus 1 - the magnitue doesn't include the end tile
    //Max.x += 1;
    //Max.y += 1;

    //Subtract 1 for the outside border.
    this.WidthTiles = this.Max.x - this.Min.x + 1;
    this.HeightTiles = this.Max.y - this.Min.y + 1;
  }

}