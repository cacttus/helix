import * as THREE from 'three';
import { Color, Box3, Object3D, MeshBasicMaterial, Material, Quaternion, Box3Helper, Texture } from 'three';
import { Globals, GameState, ResizeMode } from './Globals';
//import { basename } from 'upath';
import { Utils } from './Utils';
import { Random, ModelManager, AfterLoadFunction, Frustum, Timer, WaitTimer } from './Base';
import { vec2, vec3, vec4, mat3, mat4, ProjectedRay, Box2f, RaycastHit, ivec2 } from './Math';
import * as Files from './Files';
import { Int, roundToInt, toInt, checkIsInt, assertAsInt } from './Int';
import { Tiling, TileGrid, MasterMap, Cell, TileBlock, TiledTileId, HelixTileId, TileLayerId, HelixTileType } from './TileGrid';
import { PhysicsObject3D } from './Physics3D';

export class Color4 {
  public r: number;
  public g: number;
  public b: number;
  public a: number;
  public constructor(dr: number, dg: number, db: number, da: number) {
    this.r = dr; this.g = dg; this.b = db; this.a = da;
  }
  public equals(c: Color4): boolean {
    let b = (c.r === this.r) && (c.g === this.g) && (c.b === this.b) && (c.a === this.a);
    return b;
  }
}
enum ImageGradient { Base, Blue, Red, Green, Yellow, }
enum TimeOfDayEnum { Dawn, Day, Dusk, Night };
class TimeOfDay {
  //holds the time of day and image colors representative of it
  public time: TimeOfDayEnum = TimeOfDayEnum.Day;
  public color: ImageGradient = ImageGradient.Green;
  public gradientLocation: ivec2 = new ivec2(0, 0);
  public image: ImageData = null; // This is set asynchronously
  public interpolation_duration: number = 1;
  public constructor(dtime: TimeOfDayEnum, dcolor: ImageGradient, dlocation: ivec2, dinterp_duration: number) {
    this.time = dtime;
    this.color = dcolor;
    this.gradientLocation = dlocation.clone();
    this.interpolation_duration = dinterp_duration;
  }
}
class Environment {
  //Handles time and the changing of the image colors due to changes in the time.
  public WorldTime_Seconds: number = (5.9) * 60 * 60; /*12=noon*/ // World time in seconds = 24 * 60 * 60 hours [0,86400] 12 = noon
  public WorldSpeed: number = 120; //Testing -- 60 for 1 hour = 1 minute.
  public readonly c_WorldTimeMax = 24 * 60 * 60; // 86400;

  private _world: WorldView25D = null;
  private _times: Array<TimeOfDay> = new Array<TimeOfDay>();

  public get WorldTime_Hours(): number { return this.WorldTime_Seconds / 60 / 60; }

  private _bInterpolatingTimeOfDay: boolean = false;
  private _timeOfDayInterpolation: number = 0; //[0,1] color interpolation
  private _timeOfDayInterpolation0: TimeOfDay;
  private _timeOfDayInterpolation1: TimeOfDay;

  public constructor(world: WorldView25D) {
    this._world = world;

    // this._times = new Array<TimeOfDay>(
    //   new TimeOfDay(TimeOfDayEnum.Dawn, ImageGradient.Yellow, new ivec2(4, 1), 5),
    //   new TimeOfDay(TimeOfDayEnum.Day, ImageGradient.Green, new ivec2(1, 1), 5),
    //   new TimeOfDay(TimeOfDayEnum.Dusk, ImageGradient.Red, new ivec2(3, 1), 5),
    //   new TimeOfDay(TimeOfDayEnum.Night, ImageGradient.Blue, new ivec2(2, 1), 5),
    // );

    // let baseImageData = ImageUtils.getImageDataFromTexture(this._world.SpriteSheetMaterial.map);
    // let id2  = ImageUtils.scaleImageData(baseImageData, 4);
    // ImageUtils.swapMaterialImage(this._world.SpriteSheetMaterial, id2);

    // ImageUtils.computeImageGradients(baseImageData, this._times, TimeOfDayEnum.Day).then((resolve: boolean) => {
    //   if (Globals.isDebug()) {

    //     for (let t of this._times) {
    //       ImageUtils.debug_drawImageToCanvas(t.image);
    //     }
    //   }

    //   Globals.logInfo("Setting initial time of day.");
    //   //Set initial time of day
    //   let tod: TimeOfDay = this.getTimeOfDay();
    //   ImageUtils.swapMaterialImage(this._world.SpriteSheetMaterial, tod.image);

    // }, (reject: any) => { });
  }
  private getTimeOfDay(): TimeOfDay {
    if (this.WorldTime_Hours > (12 + 7)) {
      return this._times[TimeOfDayEnum.Night];
    }
    else if (this.WorldTime_Hours > (12 + 6)) {
      return this._times[TimeOfDayEnum.Dusk];
    }
    else if (this.WorldTime_Hours > (7)) {
      return this._times[TimeOfDayEnum.Day];
    }
    else if (this.WorldTime_Hours > (6)) {
      return this._times[TimeOfDayEnum.Dawn];
    }
    return this._times[TimeOfDayEnum.Night];//from 0 to 6am
  }

  public update(dt: number) {
    // let lastTimeOfDay = this.getTimeOfDay();

    // this.WorldTime_Seconds = (this.WorldTime_Seconds + dt * this.WorldSpeed) % this.c_WorldTimeMax;

    // let currentTimeOfDay = this.getTimeOfDay();

    // if (lastTimeOfDay !== currentTimeOfDay) {
    //   //Transition the image.
    //   this._bInterpolatingTimeOfDay = true;
    //   this._timeOfDayInterpolation = 0;
    //   this._timeOfDayInterpolation0 = lastTimeOfDay;
    //   this._timeOfDayInterpolation1 = currentTimeOfDay;
    // }

    // if (this._bInterpolatingTimeOfDay) {
    //   if (this._timeOfDayInterpolation0.image && this._timeOfDayInterpolation1.image) {
    //     let steps = 20;
    //     let step_value = this._timeOfDayInterpolation1.interpolation_duration / steps;

    //     let cur_step_value = Math.floor(this._timeOfDayInterpolation / step_value);

    //     this._timeOfDayInterpolation = Utils.clampScalar(this._timeOfDayInterpolation + dt, 0, this._timeOfDayInterpolation1.interpolation_duration);

    //     //So, since this is slow, in order to prevent lag, we'll divide this into discrete steps.

    //     let next_step_value = Math.floor(this._timeOfDayInterpolation / step_value);

    //     //If we have incremented one step, or we are on the last interpolation.
    //     if (cur_step_value !== next_step_value || (this._timeOfDayInterpolation >= this._timeOfDayInterpolation1.interpolation_duration - 0.0001)) {

    //       let interp_value_01 = this._timeOfDayInterpolation / this._timeOfDayInterpolation1.interpolation_duration;

    //       let newImage = ImageUtils.interpolateImages(this._timeOfDayInterpolation0.image, this._timeOfDayInterpolation1.image, interp_value_01);
    //       ImageUtils.swapMaterialImage(this._world.SpriteSheetMaterial, newImage);

    //       if (this._timeOfDayInterpolation >= this._timeOfDayInterpolation1.interpolation_duration - 0.0001) {
    //         this._bInterpolatingTimeOfDay = false;

    //       }
    //     }

    //   }//if images not null

    // }//If interpolating

  }
}

export class ImageUtils {
  //Basically this class was creatd to handle the changing of image colors based on time of day.
  public static scaleImageData(imageData: ImageData, scale: number) {
    let canvasxx: HTMLCanvasElement = document.createElement('canvas') as HTMLCanvasElement;
    var scaled = canvasxx.getContext('2d').createImageData(imageData.width * scale, imageData.height * scale);

    for (var row = 0; row < imageData.height; row++) {
      for (var col = 0; col < imageData.width; col++) {
        var sourcePixel = [
          imageData.data[(row * imageData.width + col) * 4 + 0],
          imageData.data[(row * imageData.width + col) * 4 + 1],
          imageData.data[(row * imageData.width + col) * 4 + 2],
          imageData.data[(row * imageData.width + col) * 4 + 3]
        ];
        for (var y = 0; y < scale; y++) {
          var destRow = row * scale + y;
          for (var x = 0; x < scale; x++) {
            var destCol = col * scale + x;
            for (var i = 0; i < 4; i++) {
              scaled.data[(destRow * scaled.width + destCol) * 4 + i] =
                sourcePixel[i];
            }
          }
        }
      }
    }

    return scaled;
  }
  public static swapMaterialImage(mat: MeshBasicMaterial, image: ImageData) {
    //Swap a material's image for some imagedata
    //**NOTE** - We're using putImageData here, but drawImage() might be faster.  Keep this in mind if porting.
    //https://stackoverflow.com/questions/7721898/is-putimagedata-faster-than-drawimage

    let canvasxx: HTMLCanvasElement = document.createElement('canvas') as HTMLCanvasElement;
    canvasxx.width = image.width;
    canvasxx.height = image.height;
    let context = canvasxx.getContext('2d');

    context.putImageData(image, 0, 0);

    mat.map = new THREE.Texture(canvasxx);
    Atlas.applyParamsToAtlas(mat.map);
    mat.needsUpdate = true;
    mat.map.needsUpdate = true;
  }
  public static debug_drawImageToCanvas(idata: ImageData): Promise<boolean> {
    return new Promise<boolean>(function (resolve, reject) {
      createImageBitmap(idata).then(function (imgBitmap) {
        try {
          let canvasxx: HTMLCanvasElement = document.createElement('canvas') as HTMLCanvasElement;
          canvasxx.width = idata.width;
          canvasxx.height = idata.height;
          let context = canvasxx.getContext('2d');
          context.drawImage(imgBitmap, 0, 0);

          document.body.append(canvasxx);

          resolve(true);
        }
        catch (ex) {
          reject(ex);
        }
      });
    });
  }
  private static getImage(idata: ImageData): Promise<ImageBitmap> {
    return new Promise<ImageBitmap>(function (resolve, reject) {
      createImageBitmap(idata).then(function (imgBitmap) {
        try {
          resolve(imgBitmap);//context.getImageData(0, 0, idata.width, idata.height));
        }
        catch (ex) {
          reject(ex);
        }
      });
    });
  }
  private static applyGradient(baseImage: ImageData, converted_image: ImageData, baseGrad: Array<Color4>, toGrad: Array<Color4>) {
    let width = baseImage.width;
    for (let iy = 0; iy < baseImage.height; ++iy) {
      for (let ix = 0; ix < baseImage.width; ++ix) {
        let c0 = ImageUtils.getPixel(ix, iy, baseImage, width);
        let grad_index = -1;
        for (let ig = 0; ig < baseGrad.length; ++ig) {
          if (baseGrad[ig].equals(c0)) {
            grad_index = ig;
          }
        }
        if (grad_index >= 0) {
          ImageUtils.setPixel(ix, iy, toGrad[grad_index], converted_image, width);
        }
        else {
          ImageUtils.setPixel(ix, iy, c0, converted_image, width);
        }
      }
    }
  }
  public static computeImageGradients(baseImage: ImageData, times: Array<TimeOfDay>, baseImageTimeOfDay: TimeOfDayEnum = TimeOfDayEnum.Day): Promise<boolean> {
    //Returns base images applied in each timeofday calss.
    //The baseimage is the base image.

    return new Promise<boolean>((resolve, reject) => {
      let c_numGradientVals = 8;

      let resolveCount = 0;
      let rejectCount = 0;

      try {
        //Find our baseimage and base gradient
        if (!baseImage) {
          reject(Globals.logError("invalid input to computeImageGradients"))
          return null;
        }
        let basetime = times.find(x => x.time === baseImageTimeOfDay);
        if (!basetime) {
          reject(Globals.logError("Base gradient could not be found."));
          return null;
        }
        let baseGrad = ImageUtils.getGradient(basetime.gradientLocation, c_numGradientVals, baseImage);

        //Apply the baseimage gradient to a set of images and create their bitmaps asynchronously
        for (let time of times) {
          let toGrad = ImageUtils.getGradient(time.gradientLocation, c_numGradientVals, baseImage);

          let converted_image: ImageData = new ImageData(baseImage.width, baseImage.height);
          this.applyGradient(baseImage, converted_image, baseGrad, toGrad);

          times[time.time].image = converted_image;
        } //End of for loop

        resolve(true);
      }
      catch (ex) {
        reject(ex);
      }

    });//end of promise

  }
  public static interpolateImages(image0: ImageData, image1: ImageData, value: number): ImageData {
    let converted_image: ImageData = new ImageData(image0.width, image0.height);
    let width = image0.width;
    for (let iy = 0; iy < image0.height; ++iy) {
      for (let ix = 0; ix < image0.width; ++ix) {
        let c0 = ImageUtils.getPixel(ix, iy, image0, width);
        let c1 = ImageUtils.getPixel(ix, iy, image1, width);

        let c2: Color4 = new Color4(
          c0.r * (1 - value) + c1.r * (value),
          c0.g * (1 - value) + c1.g * (value),
          c0.b * (1 - value) + c1.b * (value),
          c0.a * (1 - value) + c1.a * (value)
        );

        ImageUtils.setPixel(ix, iy, c2, converted_image, width);
      }
    }

    return converted_image;
  }

  public static getGradient(gradient_start: ivec2, numColors: number, tex_data: ImageData): Array<Color4> {
    //Alter the image color. 
    //Set the color of the image.
    let width = tex_data.width;
    let gradient = new Array<Color4>();
    for (let iy = 0; iy < numColors * 2; iy += 2) {
      gradient.push(ImageUtils.getPixel(gradient_start.x, gradient_start.y + iy, tex_data, width)); //1,1
    }
    return gradient;
  }
  public changeMaterialImage(material: Material, img: ImageResource) {

  }
  public applyGradientToImage(tex: Texture, grad: ImageGradient, fadeTime: number) {
    //This method is an attempt to make a "day/night" in this game with the restricted GB pallete.

  }
  public static getPixel(x: number, y: number, imageData: ImageData, imageDataWidth: number): Color4 {
    //Running the profileer this was HELLA SLOW, it was because of imageData.width for some reason.  So we pass width in now.
    let position = (x + imageDataWidth * y) * 4;
    let data = imageData.data;
    let c: Color4 = new Color4(data[position], data[position + 1], data[position + 2], data[position + 3]);
    return c;
  }
  public static setPixel(x: number, y: number, color: Color4, imageData: ImageData, imageDataWidth: number) {
    //Running the profileer this was HELLA SLOW, it was because of imageData.width for some reason.  So we pass width in now.
    let position = (x + imageDataWidth * y) * 4;
    let data = imageData.data;

    data[position + 0] = color.r;
    data[position + 1] = color.g;
    data[position + 2] = color.b;
    data[position + 3] = color.a;
  }
  public static getImageDataFromTexture(tex: Texture): ImageData {
    var canvas_texdata = document.createElement('canvas');
    canvas_texdata.width = tex.image.width;
    canvas_texdata.height = tex.image.height;

    var context = canvas_texdata.getContext('2d');
    context.drawImage(tex.image, 0, 0);
    let tex_data = context.getImageData(0, 0, tex.image.width, tex.image.height);
    return tex_data;
  }
}
export class ImageResource {
  private _location: string = "";
  public get Location(): string { return this._location; }
  //[Jsonignore]
  public Texture: THREE.Texture = null;
  public Name: string = "";
  public Id: number = -1;

  public load(loc: string, afterLoad: AfterLoadFunction) {
    this._location = loc;

    let that = this;
    new THREE.TextureLoader().load(loc, function (tex: THREE.Texture) {
      that.Texture = tex;

      Atlas.applyParamsToAtlas(tex);

      if (afterLoad) {
        afterLoad(that);
      }

    });
  }

  // private _imageData: ImageData = null;
  // public get ImageData(): ImageData {
  //   if (this._imageData === null) {

  //     var canvas = document.createElement('canvas');
  //     canvas.width = this.Texture.image.width;
  //     canvas.height = this.Texture.image.height;

  //     var context = canvas.getContext('2d');
  //     context.drawImage(this.Texture.image, 0, 0);
  //     this._imageData = context.getImageData(0, 0, this.Texture.image.width, this.Texture.image.height);
  //   }
  //   return this._imageData;
  // }

  // public getPixel(x: number, y: number): Color4 {
  //   var position = (x + this.ImageData.width * y) * 4, data = this.ImageData.data;
  //   let c: Color4 = new Color4(data[position], data[position + 1], data[position + 2], data[position + 3]);
  //   return c;
  // }
  // public setPixel(x: number, y: number, color: Color4) {
  //   var position = (x + this.ImageData.width * y) * 4, data = this.ImageData.data;

  //   this.ImageData.data[position + 0] = color.r;
  //   this.ImageData.data[position + 1] = color.g;
  //   this.ImageData.data[position + 2] = color.b;
  //   this.ImageData.data[position + 3] = color.a;
  // }

}
export class Atlas extends ImageResource {
  /*
  This is the sprite sheet.

  So, once Monogame Toolkit is finished the textrue coords will be loaded manually from a packed texture.
  for now, we;re just using straight tiled textures.
  */
  private _topPad: Int = 1 as Int;
  private _leftPad: Int = 1 as Int;
  private _rightPad: Int = 1 as Int;
  private _botPad: Int = 1 as Int;

  private _xSpace: Int = 1 as Int;  //Pixel Space between frames.
  private _ySpace: Int = 1 as Int;

  private _tileWidthPixels: Int = 16 as Int;
  private _tileHeightPixels: Int = 16 as Int;

  private _tileWidthR3: number = 1;
  private _tileHeightR3: number = 1;

  public tiledFrameIdToTuple(id: Int): ivec2 {
    let ret: ivec2 = new ivec2();
    ret.x = toInt(id % this.FramesWidth);
    ret.y = toInt(id / this.FramesWidth);
    return ret;
  }

  public static applyParamsToAtlas(tex: Texture) {
    //hacky method to set the filtering and such.
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter; //NearestMipmapNearestFilter;
    // tex.generateMipmaps = true;
    tex.needsUpdate = true;
  }

  //Number of frames across the atlas.
  public get FramesWidth(): Int {
    let x = ((this.ImageWidth - this.RightPad - this.LeftPad + this.SpaceX) / (this.TileWidthPixels + this.SpaceX));
    let xi = toInt(x);
    return xi;
  }
  public get FramesHeight(): Int {
    let x = ((this.ImageHeight - this.BotPad - this.TopPad + this.SpaceY) / (this.TileHeightPixels + this.SpaceY));
    let xi = toInt(x);
    return xi;
  }

  public get ImageWidth(): Int {
    let w = this.Texture.image.width;
    return w;
  }
  public get ImageHeight(): Int {
    let h = this.Texture.image.height;
    return h;
  }

  public get TopPad(): Int { return this._topPad; }
  public get LeftPad(): Int { return this._leftPad; }
  public get RightPad(): Int { return this._rightPad; }
  public get BotPad(): Int { return this._botPad; }
  public get SpaceX(): Int { return this._xSpace; }
  public get SpaceY(): Int { return this._ySpace; }
  public get TileWidthPixels(): Int { return this._tileWidthPixels; }
  public get TileHeightPixels(): Int { return this._tileHeightPixels; }
  public get TileWidthR3() { return this._tileWidthR3; }
  public get TileHeightR3() { return this._tileHeightR3; }

  public constructor(top: Int, left: Int, right: Int, bot: Int, xSpace: Int, ySpace: Int, tile_w: Int, tile_h: Int, tex: string, afterLoad: AfterLoadFunction) {
    super();
    this._topPad = top;
    this._leftPad = left;
    this._rightPad = right;
    this._botPad = bot;

    this._xSpace = xSpace;
    this._ySpace = ySpace;

    this._tileWidthPixels = tile_w;
    this._tileHeightPixels = tile_h;

    //this.multiply2();

    this.load(tex, afterLoad);
  }
  public getFrame(tx: Int, ty: Int, tiles_width: Int = 1 as Int, tiles_height: Int = 1 as Int, spacing_h: Int = 1 as Int, spacing_v: Int = 1 as Int, margin: number = 0.0004): SpriteFrame {
    let atlas = this;
    //Tiles_width / height is a multiple-segment frame (ex. 2 16x16 frames)
    //Spacing is a pixel space between multiple tile segments (ex. tiles_width>1)
    //Margin will shrink or grow the image to reduce texel border artifacts
    let sw: number = Number(atlas.TileWidthPixels * tiles_width - (tiles_width - 1) * spacing_h) / Number(atlas.ImageWidth);
    let sh: number = Number(atlas.TileHeightPixels * tiles_height - (tiles_height - 1) * spacing_v) / Number(atlas.ImageHeight);
    let f: SpriteFrame = new SpriteFrame();
    f.x = (Number(atlas.LeftPad) + tx * Number(atlas.TileWidthPixels + atlas.SpaceX)) / Number(atlas.ImageWidth);
    //Tex is in gl coords from bot left corner. so 0,0 is actually 0,h-1
    f.y = 1 - (Number(atlas.TopPad) + ty * Number(atlas.TileHeightPixels + atlas.SpaceY)) / Number(atlas.ImageHeight) - sh;
    f.w = sw;
    f.h = sh;
    f.tile_x_tiles = tx;
    f.tile_y_tiles = ty;
    f.tile_width_tiles = tiles_width;
    f.tile_height_tiles = tiles_height;

    if (margin !== 0) {
      f.shrink(margin);
    }

    return f;
  }

}
export class SpriteFrame {
  //A sub-image of a texture.
  //Technically we should allow multiple textures and batching, but for now, just one texture.
  public tile_x_tiles: number = 0;  //The Tile X/Y.  This is for information purposes only and may not actually be usd.
  public tile_y_tiles: number = 0;
  public tile_width_tiles: number = 0;
  public tile_height_tiles: number = 0;
  public x: number = 0; //Texture X/Y (NOT tile index)
  public y: number = 0;
  public w: number = 0;
  public h: number = 0;
  public shrink(amt: number) {
    //Add a slight margin to this frame in order to prevent small amounts of texture error.  Works well for pixel level textures with nearest filtering.
    this.x += amt;
    this.y += amt;
    this.w -= amt * 2;
    this.h -= amt * 2;
  }

  public static createQuadVerts(verts: Array<vec3> /*out*/, origin: vec3, rotation: Quaternion, scale: vec2 = new vec2(1, 1),
    width: number, height: number,
    right: vec3 = WorldView25D.RightR3,
    down: vec3 = WorldView25D.DownR3World,
    normal: vec3 = WorldView25D.Normal) {
    //Returns verts filled with the 4 quad vertexes
    // let right: vec3 = WorldView25D.RightR3;
    // let down: vec3 = WorldView25D.DownR3World;
    // let normal: vec3 = WorldView25D.Normal;

    //Position the image relative to the world grid's basis
    let tilepos_local: vec3 = origin.clone();//right.clone().multiplyScalar(origin.x);
    //tilepos_local.add(down.clone().multiplyScalar(origin.y));
    // tilepos_local.add(normal.clone().multiplyScalar(origin.z));

    //Force add 4 verts
    if (verts.length !== 4) {
      while (verts.length < 4) {
        verts.push(new vec3());
      }
    }

    verts[0] = tilepos_local;
    verts[1] = verts[0].clone().add(right.clone().multiplyScalar(width * scale.x));
    verts[2] = verts[0].clone().add(down.clone().multiplyScalar(height * scale.y));
    verts[3] = verts[2].clone().add(right.clone().multiplyScalar(width * scale.x));
  }
}
export class FDef {
  //Quick Sprite Keyframe Definition
  p: ivec2 = null;
  h: boolean = false;
  v: boolean = false;
  c: vec4 = null;
  image_interpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Step;

  public static default(framexys: Array<Array<number>>, fliph: boolean = false, flipv: boolean = false): Array<FDef> {
    let ret: Array<FDef> = new Array<FDef>();

    for (let xi = 0; xi < framexys.length; xi++) {
      if (framexys[xi].length !== 2) {
        Globals.logError("Inavlid frame xy numbers in FDef.default");
        Globals.debugBreak();
      }
      let ix: Int = framexys[xi][0] as Int;
      let iy: Int = framexys[xi][1] as Int;
      let d = new FDef(new ivec2(ix, iy), fliph, flipv, new vec4(1, 1, 1, 1), SpriteKeyFrameInterpolation.Step);
      ret.push(d);
    }
    return ret;
  }

  public constructor(dp: ivec2 = null, dh: boolean = null, dv: boolean = null, dc: vec4 = null, ii: SpriteKeyFrameInterpolation = null) {
    this.p = dp;
    this.h = dh;
    this.v = dv;
    this.c = dc;
    this.image_interpolation = ii;
  }
  public clone(): FDef {
    let f: FDef = new FDef();
    f.copy(this);
    return f;
  }
  public copy(other: FDef) {
    this.p = other.p ? other.p.clone() : null;
    this.h = other.h;
    this.v = other.v;
    this.c = other.c ? other.c.clone() : null;
    this.image_interpolation = other.image_interpolation;
  }
}
export enum SpriteKeyFrameInterpolation { Linear, Step }
export class SpriteKeyFrame {
  //Keyframe for animation
  public _parent: SpriteAnimationData = null;//MUST SET
  public _frame: SpriteFrame = null; //The frame the sprite gets set to
  public _position: vec3 = new vec3(0, 0);
  public _rotation: Quaternion = new Quaternion(1, 0, 0, 0); //Axis/angle rotation
  public _scale: vec2 = new vec2(1, 1);
  public _visible: boolean = true;
  public _color: vec4 = new vec4(1, 1, 1, 1);
  public _duration: number = 0;
  public _transformInterpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Linear;
  public _imageInterpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Step;
  public _colorInterpolation: SpriteKeyFrameInterpolation = SpriteKeyFrameInterpolation.Linear;
  public _flipH: boolean = false;
  public _flipV: boolean = false;

  public get FlipH(): boolean { return this._flipH; }
  public set FlipH(x: boolean) { this._flipH = x; }
  public get FlipV(): boolean { return this._flipV; }
  public set FlipV(x: boolean) { this._flipV = x; }
  public get TransformInterpolation(): number { return this._transformInterpolation; }
  public set TransformInterpolation(x: number) { this._transformInterpolation = x; }
  public get ImageInterpolation(): number { return this._imageInterpolation; }
  public set ImageInterpolation(x: number) { this._imageInterpolation = x; }
  public get ColorInterpolation(): number { return this._colorInterpolation; }
  public set ColorInterpolation(x: number) { this._colorInterpolation = x; }
  public get Duration(): number { return this._duration; }
  public set Duration(x: number) { this._duration = x; }
  public get Frame(): SpriteFrame { return this._frame; }
  public set Frame(x: SpriteFrame) { this._frame = x; }
  //* So make sure you know: Position is in R3 (actually, we just USE R2) GRID SPACE, not R3. 
  //* The origin of our world is at the TOP LEFT, not the BOTTOM LEFT.
  //* We convert to R3 in CreateQuadVerts.
  //* Doing it this way just makes it easier to do the tile grid math, since it's all from the top left.
  public get Position(): vec3 { return this._position; } //Relative to the sprite origin
  public set Position(x: vec3) { this._position = x; } //Relative to the sprite origin
  public get Rotation(): Quaternion { return this._rotation; } //Relative to the sprite origin
  public set Rotation(x: Quaternion) { this._rotation = x; } //Relative to the sprite origin
  public get Scale(): vec2 { return this._scale; } //Relative to the sprite origin
  public set Scale(x: vec2) { this._scale = x; } //Relative to the sprite origin
  public get Color(): vec4 { return this._color; } //Relative to the sprite origin
  public set Color(x: vec4) { this._color = x; } //Relative to the sprite origin
  public get Parent(): SpriteAnimationData { return this._parent; }

  public constructor(parent: SpriteAnimationData) {
    this._parent = parent;
  }
}
export class SpriteAnimationData {
  //Animation sequence for a single sprite component.
  private _name: string = "";
  private _lstKeyFrames: Array<SpriteKeyFrame> = new Array<SpriteKeyFrame>();

  private _duration: number = 0;

  public get Duration(): number { return this._duration; }
  public get Name(): string { return this._name; }
  public get KeyFrames(): Array<SpriteKeyFrame> { return this._lstKeyFrames; }
  public set KeyFrames(x: Array<SpriteKeyFrame>) { this._lstKeyFrames = x; }

  public calcDuration() {
    this._duration = 0;
    for (let kf of this._lstKeyFrames) {
      this._duration += kf.Duration;
    }
  }

  public constructor(name: string) {
    this._name = name;
  }
}
export class SpriteTileInfo {
  //This class defines sprite properties at the sprite level for animation definitions.
  //specifically, which layer the sprite props should be.
  public RelativeTileOffset: ivec2 = new ivec2(0, 0);
  public Layer: TileLayerId = TileLayerId.Unset; // If left unset, we set the sprite to the layer that it comes in in the map.
  public Collision: CollisionHandling = CollisionHandling.None;
  public constructor(tileoff: ivec2, layer: TileLayerId, collision: CollisionHandling) {
    this.RelativeTileOffset = tileoff;
    this.Layer = layer;
    this.Collision = collision;
  }
}
export enum CollisionHandling { None, Layer }
export enum AnimationPlayback { Playing, Pauseed, Stopped }
export class Animation25D {
  //Separate class to deal with animations and transitinos.  Just because Sprite25D was getting big.
  public static readonly c_strDefaultTileAnimation: string = "_default";

  private _animated_location: vec3 = new vec3(0, 0, 0); // Animated attributes.  These are applied if there is animation on the object.
  private _animated_rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _animated_scale: vec2 = new vec2(1, 1);
  private _animated_color: vec4 = new vec4(1, 1, 1, 1);

  private _frame: SpriteFrame = null;
  private _frame2: SpriteFrame = null; //Second frame to blend to.
  private _frameBlend: number = 0; // blend amount for the given frame.

  private _loop: boolean = true;
  private _animations: Map<string, SpriteAnimationData> = new Map<string, SpriteAnimationData>();//Shared -> Map of animation name to the data.
  private _currentAnimation: SpriteAnimationData = null;
  private _animationTime: number = 0;
  private _animationSpeed: number = 1;//multiplier
  private _playback: AnimationPlayback = AnimationPlayback.Stopped;


  private _sprite: Sprite25D = null;

  public get CurrentFrameIndex(): Int {
    if (!this.CurrentAnimation) {
      return toInt(-1);
    }
    if (!this.CurrentAnimation.KeyFrames) {
      return toInt(-1);
    }

    for (let i = 0; i < this.CurrentAnimation.KeyFrames.length; ++i) {
      if (this.CurrentAnimation.KeyFrames[i].Frame === this.Frame) {
        return toInt(i);
      }
    }
    return toInt(-1);
  }

  public get Playback(): AnimationPlayback { return this._playback; }

  public get Sprite(): Sprite25D { return this._sprite; }
  public get AnimationTime(): number { return this._animationTime; }
  public set AnimationTime(x: number) {
    this._animationTime = x;
  }
  public get AnimationSpeed(): number {
    return this._animationSpeed;
  }
  public set AnimationSpeed(x: number) {
    this._animationSpeed = x;
    for (let ch of this.Sprite.Children) {
      ch.Animation.AnimationSpeed = x;
    }
  }
  public get Animations(): Map<string, SpriteAnimationData> { return this._animations; }
  public get Loop(): boolean { return this._loop; }

  //Tile versions are animated positions.  Not the position of this object.
  public get AnimatedPosition(): vec3 { return this._animated_location; }
  public set AnimatedPosition(x: vec3) { this._animated_location = x; }
  public get AnimatedRotation(): Quaternion { return this._animated_rotation; }
  public set AnimatedRotation(x: Quaternion) { this._animated_rotation = x; }
  public get AnimatedScale(): vec2 { return this._animated_scale; }
  public set AnimatedScale(x: vec2) { this._animated_scale = x; }
  public get AnimatedColor(): vec4 { return this._animated_color; }
  public set AnimatedColor(x: vec4) { this._animated_color = x; }

  public get CurrentAnimation(): SpriteAnimationData { return this._currentAnimation; }

  public get Frame(): SpriteFrame { return this._frame; }
  public set Frame(x: SpriteFrame) {
    if (this._frame !== x) {
      this.Sprite.markDirty(DirtyFlag.UVs);
    }
    this._frame = x;
  }
  public get Frame2(): SpriteFrame { return this._frame2; }
  public set Frame2(x: SpriteFrame) {
    if (this._frame2 !== x) {
      this.Sprite.markDirty(DirtyFlag.UVs);
    }
    this._frame2 = x;
  }
  public get FrameBlend(): number { return this._frameBlend; }
  public set FrameBlend(x: number) { this._frameBlend = x; }

  public constructor(sprite: Sprite25D) {
    this._sprite = sprite;
  }
  public copy(other: Animation25D) {

    this._loop = other._loop;
    this._animations = other._animations; // this is a shallow copy.  Animation data is shared.
    this._currentAnimation = other._currentAnimation;
    this._animationTime = other._animationTime;
    this._animationSpeed = other._animationSpeed;
    this._playback = other._playback;

    this._frame = other._frame;
    this._frame2 = other._frame2;
    this._frameBlend = other._frameBlend;

    this._sprite = other._sprite;
  }
  public clone(parent: Sprite25D): Animation25D {
    let ret: Animation25D = new Animation25D(parent);
    ret.copy(this);
    return ret;
  }

  public update(dt: number) {
    //Update Animation
    if (this.Playback === AnimationPlayback.Playing) {
      let anim = this._currentAnimation;

      if (anim) {
        if (anim.KeyFrames.length > 0) {
          this._animationTime += dt * this._animationSpeed;

          let ob = this.getFrames(anim);
          let kflen = this._currentAnimation.KeyFrames.length;
          if (ob.frameA >= 0 &&
            ob.frameA < kflen &&
            ob.frameB >= 0 &&
            ob.frameB < kflen) {

            let keyA = anim.KeyFrames[ob.frameA];
            let keyB = anim.KeyFrames[ob.frameB];
            this.interpolateKeyFrames(keyA, keyB, ob.t01);
          }
          else {
            Globals.logError("Animation keyframes out of bounds: " + anim.Name);
          }

        }//anim.keyframes.length > 0
      }//if(anim)
    }
  }

  public setKeyFrame(frameIndex: number, anim: string = null, recursive: boolean = true) {
    let my_anim: SpriteAnimationData = null;

    if (anim !== null) {
      my_anim = this.Animations.get(anim);
    }
    if (my_anim === null) {
      my_anim = this._currentAnimation;
    }
    //Sets the given keyframe data for the character.
    if (my_anim) {
      if (my_anim.KeyFrames.length > frameIndex) {
        let key = my_anim.KeyFrames[frameIndex];
        this.interpolateKeyFrames(key, null, 0);
      }
      else {
        Globals.logError("Tried to set invalid keyframe for obj " + this.Sprite.Name + " index : " + frameIndex);
      }
    }

    if (recursive) {
      for (const c of this.Sprite.Children) {
        c.Animation.setKeyFrame(frameIndex, anim, recursive);
      }
    }

  }
  public pause() {
    this._playback = AnimationPlayback.Stopped;
    for (const c of this.Sprite.Children) {
      c.Animation.pause();
    }
  }
  public isPlaying(name: string): boolean {
    let r = (this._playback === AnimationPlayback.Playing) && this.CurrentAnimation && (this.CurrentAnimation.Name === name);
    return r;
  }
  public play(animation_name: string = null, restart: boolean = true) {
    //if PreventRestart is true, then skip setting a new animation if the same animation is already playing.
    if (animation_name === null) {
      if (this._currentAnimation) {
        this._playback = AnimationPlayback.Stopped;
      }
      this._currentAnimation = null;
    }
    else if ((this.CurrentAnimation !== null) && (this.CurrentAnimation.Name === animation_name) && !restart) {
      //Do not play new animation.  It's already playing and we dont' want to interrupt.
      this._playback = AnimationPlayback.Playing;
    }
    else {
      let d = this._animations.get(animation_name);
      if (d) {
        this._currentAnimation = d;
        this._playback = AnimationPlayback.Playing;
      }
      else {
        //not found.
      }
    }

    for (const c of this.Sprite.Children) {
      c.Animation.play(animation_name);
    }
  }
  private _tileData_Cached: SpriteAnimationData = null;//Store it for easier retrieval.
  public get TileData(): SpriteAnimationData {
    if (!this._tileData_Cached) {
      this._tileData_Cached = this.Animations.get(Animation25D.c_strDefaultTileAnimation);
    }
    return this._tileData_Cached;
  }
  public addTileFrame(tile: ivec2, atlas: Atlas, imageSize: ivec2 = new ivec2(1, 1), props: Array<SpriteTileInfo> = null, frameDuration: number = 0) {
    //For background tiles and tile sets, we have a separate animation data that holds a list of static frames.
    this.addTiledAnimation(Animation25D.c_strDefaultTileAnimation, FDef.default([[tile.x, tile.y]]), frameDuration, atlas, imageSize, true, props);
  }
  public addTiledAnimation(animation_name: string, frames: Array<FDef>, duration: number, atlas: Atlas, imageSize:
    ivec2 = null, append: boolean = false, props: Array<SpriteTileInfo> = null) {
    //This sets 'real' frame-by-frame animation for a multiple tiled sprite, OR can be used to set static tiled animations.
    //if Append is true, we append the given FDef keys to the input animation
    //Frames should reference from the top left corner (root) of the animated image.
    //This both creates sprites and adds animations to them.
    //Props: Note that if you have props you must define a prop for each tile in the image.
    for (let jtile = 0; jtile < imageSize.y; ++jtile) {
      for (let itile = 0; itile < imageSize.x; ++itile) {

        //Find sprite prop if we have one defined.
        let prop: SpriteTileInfo = null;
        if (props && props.length > 0) {
          for (let ob_prop of props) {
            if (ob_prop.RelativeTileOffset.x === toInt(itile) && ob_prop.RelativeTileOffset.y === toInt(jtile)) {
              prop = ob_prop;
              break;
            }
          }

          if (prop === null) {
            Globals.logError("Could not find tiled sprite prop for a property-defined tiled sprite.");
            Globals.debugBreak();
          }
        }



        if (itile === 0 && jtile === 0) {
          this.Sprite.SubTile = new vec2(itile, jtile);
          //Root tile is tile 0,0
          //Add the animation to THIS sprite.
          this.addAnimation(animation_name, frames, duration, atlas, append);

          if (prop) {
            this.Sprite.applyProp(prop);
          }
        }
        else {
          //SUB-TILE
          //Get the given sub-tile sprite, or create and add it to this sprite.
          let sp: Sprite25D = this.Sprite.getSubTile(itile, jtile);
          if (sp === null) {
            sp = new Sprite25D(atlas);
            sp.Name = this.Sprite.Name + "_subtile_" + itile + "_" + jtile;
            sp.Layer = this.Sprite.Layer;
            sp.SubTile = new vec2(itile, jtile);
            this.Sprite.add(sp);
          }

          sp.Animation.addAnimation(animation_name, frames, duration, atlas, append);
          sp.Position.set(
            this.Sprite.Position.x + itile * this.Sprite.Size.x,
            this.Sprite.Position.y + jtile * this.Sprite.Size.y,
            this.Sprite.Position.z);

          if (prop) {
            sp.applyProp(prop);
          }
        }
      }
    }
  }
  private addAnimation(animation_name: string, frames: Array<FDef>, duration: number, atlas: Atlas, append: boolean = false, isTileFrame: boolean = false): SpriteAnimationData {
    //if Append is true, we append the given FDef keys to the input animation
    let ret: SpriteAnimationData = null;

    // if (isTileFrame) {
    //   //We are static tileframe frame(s)
    //   if (this._tileData === null) {
    //     this._tileData = new SpriteAnimationData(animation_name);
    //   }
    //   ret = this._tileData;
    // }
    // else {
    ret = this.Animations.get(animation_name);
    if (ret) {
      if (append === false) {
        Globals.logError("Tried to add another animation " + animation_name + " -- already added.");
        Globals.debugBreak();
        return null;
      }
      else {
        //Do nothign, we got it
      }
    }
    else {
      ret = new SpriteAnimationData(animation_name);
    }
    // }

    //If we are a sub-tile animation, then add the parent sprite's sub-tile coordinates to the input animation.
    let sub_x = 0;
    let sub_y = 0;
    if (this.Sprite.SubTile) {
      sub_x = this.Sprite.SubTile.x;
      sub_y = this.Sprite.SubTile.y;
    }

    //Create Tiles.

    for (let iframe = 0; iframe < frames.length; ++iframe) {
      let def: FDef = frames[iframe];

      let kf = new SpriteKeyFrame(ret);

      kf.Frame = atlas.getFrame((def.p.x + sub_x) as Int, (def.p.y + sub_y) as Int);

      kf.Color = def.c ? def.c : new vec4(1, 1, 1, 1);// Random.randomVec4(0, 1);
      kf.FlipH = def.h ? def.h : false;
      kf.FlipV = def.v ? def.v : false;

      kf.ImageInterpolation = def.image_interpolation;

      if (isTileFrame) {
        kf.Duration = 9999999;
      }
      else {
        kf.Duration = duration / frames.length;
      }

      ret.KeyFrames.push(kf);
    }

    if (isTileFrame) {
    }
    else {
      this.Animations.set(animation_name, ret);
    }

    ret.calcDuration();

    return ret;
  }
  private getFrames(anim: SpriteAnimationData): any {
    //Return value is an object.
    let ob: any = { frameA: -1, frameB: -1, t01: 0.0 };

    let total_time: number = 0;

    //Get frame a and b to interpolate
    for (let ki = 0; ki < anim.KeyFrames.length; ++ki) {
      let key = anim.KeyFrames[ki];
      let next_time = total_time + key.Duration;

      if (this._animationTime < next_time) {
        ob.frameA = ki;
        ob.t01 = (this._animationTime - total_time) / (next_time - total_time)
        break;
      }
      total_time += key.Duration;
    }

    if (ob.frameA === -1) {
      if (this._loop) {
        ob.frameA = 0;
        this._animationTime = 0;
      }
      else {
        ob.frameA = anim.KeyFrames.length - 1;
        this._animationTime = anim.Duration;
      }
    }

    ob.frameB = ob.frameA + 1;
    if (ob.frameB >= anim.KeyFrames.length) {
      if (this._loop) {
        ob.frameB = 0;
      }
      else {
        ob.frameB = ob.frameA;
      }
    }

    return ob;
  }
  private interpolateKeyFrames(keyA: SpriteKeyFrame, keyB: SpriteKeyFrame, t01: number) {
    //KeyB can be null, in which case we just set the keyframe to be frame A and we ignore t01

    let p: vec3 = null;
    let r: Quaternion = null;
    let s: vec2 = null;
    let c: vec4 = null;

    if (keyB === null) {
      p = keyA.Position.clone();
      s = keyA.Scale.clone();
      r = keyA.Rotation.clone();
      c = keyA.Color.clone();
    }
    else {
      if (keyB.TransformInterpolation === SpriteKeyFrameInterpolation.Linear) {
        p = keyA.Position.clone().lerp(keyB.Position, t01);
        s = keyA.Scale.clone().lerp(keyB.Scale, t01);
        r = keyA.Rotation.clone().slerp(keyB.Rotation, t01);
      }
      else if (keyB.TransformInterpolation === SpriteKeyFrameInterpolation.Step) {
        p = keyA.Position.clone();
        s = keyA.Scale.clone();
        r = keyA.Rotation.clone();
      }

      if (keyB.ColorInterpolation === SpriteKeyFrameInterpolation.Linear) {
        c = keyA.Color.clone().lerp(keyB.Color, t01);
      }
      else if (keyB.ColorInterpolation === SpriteKeyFrameInterpolation.Step) {
        c = keyA.Color.clone();
      }
    }

    this.AnimatedPosition = p;
    this.AnimatedScale = s;
    this.AnimatedRotation = r;
    this.AnimatedColor = c;
    this.Sprite.FlipH = keyA.FlipH;
    this.Sprite.FlipV = keyA.FlipV;

    //TODO: blended image interpolation
    if (keyB && keyB.ImageInterpolation === SpriteKeyFrameInterpolation.Linear) {
      this.Frame = keyA.Frame;
      this.Frame2 = keyB.Frame;
      this.FrameBlend = t01;
    }
    else {
      this.Frame = keyA.Frame;
      this.Frame2 = null;
      this.FrameBlend = 0;
    }
  }
}

export interface CollisionFunction25D { (thisObj: Phyobj25D, other: Phyobj25D, this_block: TileBlock, other_block: TileBlock): void; }
export interface GestureCallback { (thisObj: Sprite25D, this_block: TileBlock, hand: Tickler): void; }
export enum DirtyFlag { /*Transform = 0x01,*/ UVs = 0x02, Normals = 0x04, Colors = 0x08, All = 0x01 | 0x02 | 0x04 | 0x08 }
export class Sprite25D {

  private static _idGen = 1; // Do not clone
  private _helixTileId: HelixTileId = MasterMap.UNDEFINED_TILE;
  private _name: string = "";
  private _uniqueId: number = 0;// DO NOT CLONE
  private _worldView: WorldView25D = null; // Do not clone
  private _dirty: boolean = false;// Do not clone MUST default to false.  
  private _destroyed: boolean = false; // Do not clone

  private _location: vec3 = new vec3(0, 0, 0); // Location of the object (relative to parent or scene).  This is not animated.
  private _rotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _scale: vec2 = new vec2(1, 1);

  private _worldlocation: vec3 = new vec3(0, 0, 0); // Final location of the object in GRID SPACE with animations & parenting applied
  private _worldrotation: Quaternion = new Quaternion(0, 0, 0, 0);
  private _worldscale: vec2 = new vec2(1, 1);
  private _worldcolor: vec4 = new vec4(1, 1, 1, 1);

  public _tilingAnimated: boolean = false; // True if the tiling for this tile is animated
  private _subTile: vec2 = null; //If set, this tile is a collection of other subtiles.

  private _size: vec2 = new vec2(1, 1); // this is actual size of rendered geometry.  This is initially set by Atlas.TileWidthR3
  private _origin: vec3 = new vec3(0, 0, 0);
  private _children: Array<Sprite25D> = new Array<Sprite25D>();
  private _parent: Sprite25D = null; // Do not clone
  private _visible: boolean = true;
  private _dirtyFlags: number = 0 | 0; // Do not clone

  private _color: vec4 = new vec4(1, 1, 1, 1);
  public _flipH: boolean = false;
  public _flipV: boolean = false;
  public _animation: Animation25D = null;

  private _boundBox_grid: Box2f = new Box2f();// The animated bounds of the sprite.
  private _boundBox_world: Box2f = new Box2f();// The animated bounds of the sprite.
  private _quadVerts: Array<vec3> = new Array<vec3>();  //Quad Verts - do not clone
  private _quadNormal: vec3 = new vec3(0, 0, 1); // do not clone

  // private _isCellTile: boolean = false;
  public _layer: TileLayerId = TileLayerId.Unset;
  protected _atlas: Atlas = null;
  private _collisionHandling: CollisionHandling = CollisionHandling.None;

  private _tiling: Tiling = Tiling.None;

  //This is a rudimentary test of collisions.  We'll get fancy later.
  private _preCollisionFunction: CollisionFunction25D = null;
  private _postCollisionFunction: CollisionFunction25D = null;
  private _collisionFunction: CollisionFunction25D = null;
  private _collisionBits: Int = toInt(0); // Use the CollisioNbits enum

  private _gestureCallback: GestureCallback = null;
  private _gesture: HandGesture = HandGesture.None;
  private _r3Parent: Object3D = null; // Do not clone - Remove this when we've created gesture sprites as PhysicsObjects 

  public AfterLoadCallback: Function = null; //Called after the sprite is created.

  private _tileType: HelixTileType = HelixTileType.Unset;

  public snapToCell(c: Cell) {
    if (c) {
      this.Position = new vec3(c.CellPos_World.x, c.CellPos_World.y, 0);
    }
  }

  public get TileType(): HelixTileType { return this._tileType; }
  public set TileType(x: HelixTileType) { this._tileType = x; }
  // public get IsBorderBlocker(): boolean { return this._tileType === HelixTileType.BorderBlocker; }
  // public get IsDoorTrigger(): boolean { return this._tileType === HelixTileType.DoorTrigger; }

  //Hand Gesture stuff
  public get GestureCallback(): GestureCallback { return this._gestureCallback; }
  public set GestureCallback(x: GestureCallback) { this._gestureCallback = x; }

  public get Gesture(): HandGesture { return this._gesture; }
  public set Gesture(x: HandGesture) { this._gesture = x; }

  public get R3Parent(): Object3D { return this._r3Parent; }
  public set R3Parent(x: Object3D) { this._r3Parent = x; }

  public get PreCollisionFunction(): CollisionFunction25D { return this._preCollisionFunction; }
  public set PreCollisionFunction(x: CollisionFunction25D) { this._preCollisionFunction = x; }

  public get CollisionFunction(): CollisionFunction25D { return this._collisionFunction; }
  public set CollisionFunction(x: CollisionFunction25D) { this._collisionFunction = x; }

  public get PostCollisionFunction(): CollisionFunction25D { return this._postCollisionFunction; }
  public set PostCollisionFunction(x: CollisionFunction25D) { this._postCollisionFunction = x; }

  public get CollisionHandling(): CollisionHandling { return this._collisionHandling; }
  public set CollisionHandling(x: CollisionHandling) { this._collisionHandling = x; }

  public get CollisionBits(): Int { return this._collisionBits; }
  public set CollisionBits(x: Int) { this._collisionBits = x; }

  public get Layer(): TileLayerId { return this._layer; }
  public set Layer(x: TileLayerId) { this._layer = x; }

  // public get IsCellTile(): boolean { return this._isCellTile; }
  // public set IsCellTile(x: boolean) { this._isCellTile = x; }

  public get Tiling(): Tiling { return this._tiling; }
  public set Tiling(x: Tiling) { this._tiling = x; }

  public get TilingAnimated(): boolean { return this._tilingAnimated; }
  public set TilingAnimated(x: boolean) { this._tilingAnimated = x; }

  public get BoundBox_Grid(): Box2f { return this._boundBox_grid; }
  public get BoundBox_World(): Box2f { return this._boundBox_world; }

  public get HelixTileId(): HelixTileId { return this._helixTileId; }
  public set HelixTileId(x: HelixTileId) { this._helixTileId = x; }

  public get QuadVerts(): Array<vec3> { return this._quadVerts; }
  public get QuadNormal(): vec3 { return this._quadNormal; }
  public set QuadNormal(x: vec3) { this._quadNormal = x; this.markDirty(DirtyFlag.Normals); }

  public get Animation(): Animation25D { return this._animation; }

  public get Name(): string { return this._name; }
  public set Name(x: string) { this._name = x; }

  //SubTile is used to make multi-tile animations.  In addTiledAnimation the subtile adds an x/y offset to the animation.
  //The sub-tile is a tile relative to a "root" Sprite of 0,0 and adds the keyframe offsets to this location.  
  //This is for multi-tiled sprite animations, for example a character that is 2 tiles high (ex. pokemon char sprite)
  public get SubTile(): vec2 { return this._subTile; }
  public set SubTile(x: vec2) { this._subTile = x; }

  public get FlipH(): boolean { return this._flipH; }
  public set FlipH(x: boolean) { this._flipH = x; }
  public get FlipV(): boolean { return this._flipV; }
  public set FlipV(x: boolean) { this._flipV = x; }

  public get UniqueId(): number { return this._uniqueId; }
  public get Origin(): vec3 { return this._origin; }
  public get DirtyFlags(): number { return this._dirtyFlags; }
  public get Visible(): boolean { return this._visible; }
  public set Visible(x: boolean) { this._visible = x; }
  public get Parent(): Sprite25D { return this._parent; }
  public get Children(): Array<Sprite25D> { return this._children; }
  public get WorldView(): WorldView25D { return this._worldView; }
  public set WorldView(x: WorldView25D) { this._worldView = x; }

  public get Dirty(): boolean { return this._dirty; }

  public get Destroyed(): boolean { return this._destroyed; }
  public set Destroyed(x: boolean) { this._destroyed = x; }

  public get Position(): vec3 { return this._location; } //Position in Tile World space (Not OpenGL World space)
  public set Position(x: vec3) { this._location = x; }
  public get Rotation(): Quaternion { return this._rotation; }
  public set Rotation(x: Quaternion) { this._rotation = x; }
  public get Scale(): vec2 { return this._scale; }
  public set Scale(x: vec2) { this._scale = x; }
  public get Color(): vec4 { return this._color; }
  public set Color(x: vec4) { this._color = x; this.markDirty(DirtyFlag.Colors); }

  public get Center(): vec3 {
    //Returns the sprite tile center in Tile World space without depth applied.
    return new vec3(
      this._location.x + this.WorldView.Atlas.TileWidthR3 * 0.5,
      this._location.y + this.WorldView.Atlas.TileWidthR3 * 0.5,
      0
    );
  }

  public get WorldPosition(): vec3 { return this._worldlocation; }
  public set WorldPosition(x: vec3) { this._worldlocation = x; }
  public get WorldRotation(): Quaternion { return this._worldrotation; }
  public set WorldRotation(x: Quaternion) { this._worldrotation = x; }
  public get WorldScale(): vec2 { return this._worldscale; }
  public set WorldScale(x: vec2) { this._worldscale = x; }
  public get WorldColor(): vec4 { return this._worldcolor; }
  public set WorldColor(x: vec4) { this._worldcolor = x; }

  public get Size(): vec2 { return this._size; }
  public set Size(x: vec2) { this._size = x; }
  public get Width(): number { return this._size.x; }
  public set Width(x: number) { this._size.x = x; }
  public get Height(): number { return this._size.y; }
  public set Height(x: number) { this._size.y = x; }

  private _debugBox: THREE.Box3Helper = null;

  public constructor(atlas: Atlas/*, name: string = null, tileId: HelixTileId = MasterMap.UNDEFINED_TILE, layer: TileLayerId = null*/) {
    this._atlas = atlas;
    if (name) {
      this._name = name;
    }
    // if (layer) {
    //   this._layer = layer;
    // }
    // this._helixTileId = tileId;

    this._uniqueId = Sprite25D._idGen++;
    this._animation = new Animation25D(this);

    this._size.x = atlas.TileWidthR3;
    this._size.y = atlas.TileHeightR3;
  }

  public copy(other: Sprite25D) {
    //We do not clone every member, see comments above.

    //idgen
    this._helixTileId = other._helixTileId;
    this._name = other._name;
    //uniqueid
    //worldview
    //dirty
    //destroyed
    this._location = other._location.clone();
    this._rotation = other._rotation.clone();
    this._scale = other._scale.clone();

    this._worldlocation = other._worldlocation.clone();
    this._worldrotation = other._worldrotation.clone();
    this._worldscale = other._worldscale.clone();
    this._worldcolor = other._worldcolor.clone();

    this._tilingAnimated = other._tilingAnimated;
    this._subTile = other._subTile.clone();

    this._size = other._size.clone();
    this._origin = other._origin.clone();
    for (let ci = 0; ci < other._children.length; ci++) {
      this._children.push(other._children[ci].clone());
    }
    //parent
    this._visible = other._visible;
    //dirtyflags
    this._color = other._color;
    this._flipH = other._flipH;
    this._flipV = other._flipV;
    this._animation = other._animation.clone(this);

    this._boundBox_grid = other._boundBox_grid.clone();
    this._boundBox_world = other._boundBox_world.clone();
    //quad verts
    //quadnormal
    this._layer = other._layer;
    this._atlas = other._atlas;
    this._collisionHandling = other._collisionHandling;

    this._tiling = other._tiling;

    if (other._preCollisionFunction) {
      this._preCollisionFunction = Object.assign(other._preCollisionFunction);
    }
    if (other._collisionFunction) {
      this._collisionFunction = Object.assign(other._collisionFunction);
    }
    if (other._postCollisionFunction) {
      this._postCollisionFunction = Object.assign(other._postCollisionFunction);
    }
    this._collisionBits = other._collisionBits;

    this._gestureCallback = other._gestureCallback;
    this._gesture = other._gesture;
    //r3parent
    //afterloadcallback
    this._tileType = other._tileType;
  }
  public clone(): Sprite25D {
    let ret = new Sprite25D(this._atlas);
    ret.copy(this);
    return ret;
  }
  public update(dt: number, box: Box2f = null) {
    this.Animation.update(dt);

    if (box === null) {
      box = this._boundBox_world;
      box.GenResetExtents();
    }

    this.calcQuadVerts();

    //Update Children
    for (let ci = 0; ci < this._children.length; ++ci) {
      this._children[ci].update(dt, box);
    }

    //Debug Box
    if (Globals.isDebug() && box === this._boundBox_world) {
      if (this._debugBox !== null) {
        Globals.scene.remove(this._debugBox);
      }
      this._debugBox = new THREE.Box3Helper(new THREE.Box3(
        new vec3(this._boundBox_world.Min.x, this._boundBox_world.Min.y, this.Position.z - 0.5),
        new vec3(this._boundBox_world.Max.x, this._boundBox_world.Max.y, this.Position.z + 0.5)
      ), new Color(1, 0, 0));
      Globals.scene.add(this._debugBox);
    }

    this._boundBox_grid = this.calcBoundBoxGrid();

    this._boundBox_world = this._boundBox_grid.clone();
    let tmp = this._boundBox_world.Min.y;
    this._boundBox_world.Min.y = -this._boundBox_world.Max.y;
    this._boundBox_world.Max.y = -tmp;
  }
  public calcBoundBoxGrid(nextpos_grid: vec3 = null) {
    let v = nextpos_grid ? nextpos_grid : this.Position;
    let box = new Box2f();
    box.Min.set(v.x, v.y);
    box.Max = box.Min.clone();
    box.Max.x += g_atlas.TileWidthR3;
    box.Max.y += g_atlas.TileWidthR3;
    return box;
  }

  public add(ob: Sprite25D) {
    if (this.findById(ob.UniqueId) !== null) {
      Globals.logError("Tried to add duplicate sprite to hierarchy.");
    }
    else {
      this._children.push(ob);
      ob._parent = this;
    }
  }
  public findById(id: number) {
    let ret: { x: Sprite25D; } = { x: null };
    this.findById_r(id, ret);
    return ret.x;
  }
  private findById_r(id: number, ret: { x: Sprite25D }) {
    if (this.UniqueId === id) {
      ret.x = this;
      return;
    }
    else {
      for (let c of this.Children) {
        c.findById_r(id, ret);
        if (ret.x) {
          break;
        }
      }
    }
  }
  public remove(ob: Sprite25D) {
    for (let i = 0; i < this._children.length; i--) {
      if (this._children[i] === ob) {
        this._children.splice(i, 1);
        ob._parent = null;
        break;
      }
    }
  }
  public destroy() {
    if (this.WorldView) {
      this.WorldView.destroyObject25(this);
      for (let ci = 0; ci < this._children.length; ++ci) {
        this._children[ci].destroy();
      }
    }
  }
  public getSubTile(i: number, j: number): Sprite25D {
    //Returns the SubTile at the given i,j offset
    let ret: { x: Sprite25D; } = { x: null };
    this.getSubTile_r(i, j, ret);
    return ret.x;
  }
  private getSubTile_r(i: number, j: number, ret: { x: Sprite25D }) {
    if (this.SubTile && this.SubTile.x === i && this.SubTile.y === j) {
      ret.x = this;
    }
    else {
      for (let c of this.Children) {
        c.getSubTile_r(i, j, ret);
        if (ret.x) { }
        break;
      }
    }
  }
  public calcQuadVerts() {
    //Translate tile with origin.
    this._worldlocation = this.Position.clone().add(this.Animation.AnimatedPosition).add(this.Origin);
    this._worldscale = this.Scale.clone().multiply(this.Animation.AnimatedScale);
    this._worldrotation = this.Rotation.clone().multiply(this.Animation.AnimatedRotation);
    this._worldcolor = Utils.multiplyVec4(this.Color.clone(), this.Animation.AnimatedColor);

    //This got hacky.  Basically JUST Character sprites are having a negative Y.
    //They are in GRID space and not WORLD space for some reason as opposed to tiles.
    //Should be fixed..

    //Apply parent transform.
    if (this.Parent) {
      //**HACK!!!:
      this._worldlocation.add(this.Parent.WorldPosition.clone().setY(this.Parent.WorldPosition.y * -1)); //Convert from Grid to World
      this._worldscale.multiply(this.Parent.WorldScale);
      this._worldrotation.multiply(this.Parent.WorldRotation);
      Utils.multiplyVec4(this._worldcolor, this.Parent.WorldColor);
    }


    //R3 Parent- We use this to move the tiles around realitve to hand
    if (this.R3Parent) {
      let v: vec3 = new vec3();
      this.R3Parent.getWorldPosition(v);
      this._worldlocation.add(v);
    }

    //TODO fix this
    this._worldlocation.y *= -1; //HACK://Convert from Grid to World

    SpriteFrame.createQuadVerts(this.QuadVerts, this._worldlocation, this._worldrotation, this._worldscale, this.Width, this.Height);
  }
  public markDirty(flags: number = DirtyFlag.All) {
    this._dirty = true;
    this._dirtyFlags |= flags;
  }
  public clearDirty() {
    this._dirty = false;
    this._dirtyFlags = 0;
  }

  public applyProp(sp: SpriteTileInfo) {
    this.Layer = sp.Layer;
    this.CollisionHandling = sp.Collision;
  }
  protected checkCollision(cell: Cell): boolean {
    var res: { value: boolean } = { value: false };
    this.checkCollision_r(cell, res);

    return res.value ? res.value : false;
  }
  private checkCollision_r(cell: Cell, result: { value: boolean }) {
    if (result.value) {
      return;
    }

    if (cell.isBlocked(this.Layer as Int)) {
      result.value = true;
      return;
    }

    for (let ch of this.Children) {
      if (ch.canCollide()) {
        ch.checkCollision_r(cell, result);
      }
    }

  }
  public canCollide(): boolean {
    return this.CollisionHandling === CollisionHandling.Layer;
  }
  public getTileBounds() : Box2f{
    let ret = new Box2f();
    ret.GenResetExtents();
    for(let kf of this.Animation.TileData.KeyFrames){
      ret.ExpandByPoint(new vec2(kf.Frame.tile_x_tiles, kf.Frame.tile_y_tiles));
    }
    return ret;
  }
}
export class Phyobj25D extends Sprite25D {
  private _velocity: vec3 = new vec3(0, 0, 0);
  public get Velocity(): vec3 { return this._velocity; }
  public set Velocity(x: vec3) { this._velocity = x; }

  public ApplySnap: boolean = false;

  public constructor(atlas: Atlas) {
    super(atlas);
  }
  public copy(other: Phyobj25D) {
    super.copy(other);
    this._velocity = other._velocity.clone();
  }
  public clone(): Phyobj25D {
    let ret = new Phyobj25D(this._atlas);
    ret.copy(this);
    return ret;
  }
  public update(dt: number) {
    //Update physics.
    let next_pos: vec3 = this.Position.clone().add(this.Velocity);
    let next_box = this.calcBoundBoxGrid(next_pos);

    let cells = this.WorldView.MasterMap.Area.Grid.GetCellManifoldForBox(next_box);

    //Slow, shitty.  This is a first pass collision function.
    for (let cell of cells) {

      for (let block of cell.Blocks) {
        if (block) {//This should no longer be null
          if (block.SpriteRef) {

            if (block.SpriteRef.PreCollisionFunction) {
              block.SpriteRef.PreCollisionFunction(null, this, block, null);
            }

            if (block.SpriteRef.CollisionFunction) {
              if (this.BoundBox_Grid.BoxIntersect_EasyOut_Inclusive(cell.BoundBox_World)) {
                block.SpriteRef.CollisionFunction(null, this, block, null);

                //block.SpriteRef.CollisionFunction(block, null, this);
              }
            }

          }
        }
      }

    }

    //Update Position + velocity
    if (this.Velocity.lengthSq()) {
      this.Position.copy(this.Position.clone().add(this.Velocity));

      //If we got a command to snap the player after applying velocity.
      if (this.ApplySnap) {
        //Snap.
        let c = this.WorldView.MasterMap.Area.Grid.GetCellForPoint_WorldR3(this.Center);
        //   this.snapToCell(c);
        this.ApplySnap = false;
      }

      //Reset velocity
      this.Velocity.set(0, 0, 0);
    }

    super.update(dt);
  }

}
export enum Direction4Way { None, Left, Right, Up, Down };
export class Character extends Phyobj25D {
  private _bMoving: boolean = false;
  private _eMoveDirection: Direction4Way = Direction4Way.None;
  private _startPosition: vec3 = new vec3();
  private _destination: vec3 = new vec3(); // The cell location where we are moving.
  private _speed: number = 2.1;
  private _isPlayer: boolean = false;
  private _eCommandedDirection: Direction4Way = Direction4Way.None;//The direction the player commanded.
  private _speedMultiplier: number = 1;
  private _carryover_velocity: number = 0;//Carryover, if we are moving in the same direction but we've hit a tile boundary. This prevents hiccups in a low frame rate.
  private _hitSoundTimer: WaitTimer = new WaitTimer(.6);
  private _runSoundTimer: WaitTimer = new WaitTimer(.6);

  public set SpeedMultiplier(x: number) { this._speedMultiplier = x; }
  public get SpeedMultiplier(): number { return this._speedMultiplier; }
  public get IsPlayer(): boolean { return this._isPlayer; }
  public set IsPlayer(x: boolean) { this._isPlayer = x; }


  public constructor(atlas: Atlas) {
    super(atlas);
  }
  public copy(other: Character) {
    super.copy(other);
    //_bMoving
    this._eMoveDirection = other._eMoveDirection;
    this._startPosition = other._startPosition.clone();
    //this._destination = other._destination.clone();
    this._speed = other._speed;
    this._isPlayer = other._isPlayer;
    //this._eCommandedDirection = 
    //speedmultiplier
    //carryover_vloecity
    //hittimer
    //runtimer

  }
  public clone(): Character {
    let ret = new Character(this._atlas);
    ret.copy(this);
    return ret;
  }

  public update(dt: number) {

    if (Globals.input.keyboard && Globals.input.keyboard.getKey(32 as Int).pressOrHold()) {
      Globals.audio.stopMusic(Files.Audio.MusicBeepy);

    }

    this._hitSoundTimer.update(dt);
    this._runSoundTimer.update(dt);
    this.updateMovement(dt);
    super.update(dt);
  }
  public move(dir: Direction4Way) {
    //Command the char to move, we'll update it in the char's physics routine.
    this._eCommandedDirection = dir;
  }
  private updateMovement(dt: number) {
    this.updatePosition(dt);
    if (this.computeNextDestination()) {
      this.updatePosition(dt); //Call a second time here, to prevent the player from stopping for a farme if the arrow key is held down.
    }
  }
  private stopMovementAnimation() {
    this.Animation.pause();
    this.Animation.setKeyFrame(0, null, true);
  }
  private playMovementAnimation(dir: Direction4Way) {
    let a: string = Character.getAnimationNameForMovementDirection(dir);
    if (!this.Animation.isPlaying(a)) {
      this.Animation.play(a, true);
    }
    this.Animation.AnimationSpeed = this.SpeedMultiplier;
  }
  private updatePosition(dt: number) {
    if (this._bMoving) {
      let speed = this._speed * dt * this.SpeedMultiplier;

      let n: vec3 = Character.getMovementNormalForDirection(this._eMoveDirection);
      let nextPos: vec3 = this.Position.clone().add(n.clone().multiplyScalar(speed));
      let vel_len: number = 0;

      //Check if position reached.
      let dest_delta: number = this._destination.clone().sub(this._startPosition).lengthSq();
      let this_delta: number = nextPos.clone().sub(this._startPosition).lengthSq() + this._carryover_velocity;

      this._carryover_velocity = 0;

      let dest_len: number = this._destination.clone().sub(this.Position).length();
      let this_len: number = nextPos.clone().sub(this.Position).length() + this._carryover_velocity;

      if (this_delta >= dest_delta) {
        //Overshot our dest, set the position.
        vel_len = dest_len;
        this._bMoving = false;
        this.stopMovementAnimation();
        this.ApplySnap = true;
      }
      else {
        vel_len = this_len;

        //Run Noise
        if (this.SpeedMultiplier > 1.1) {
          this._runSoundTimer.interval = (1.0 / (this.SpeedMultiplier * 4)); // 4 = .125 = 4 for 4 frames.
          if (this._runSoundTimer.ready()) {
            Globals.audio.play(Files.Audio.RunStep, this.Center);
            this._runSoundTimer.reset();
          }
        }

      }
      this.Velocity.copy(n.clone().multiplyScalar(vel_len));


      if (this._isPlayer) {
        this.WorldView.InputControls.lookAtPlayerChar();
      }
    }

  }
  private computeNextDestination(): boolean {
    //Move 1 tile.

    if (this._eCommandedDirection !== Direction4Way.None) {
      if (!this._bMoving) {
        let n = Character.getMovementNormalForDirection(this._eCommandedDirection);
        n.multiplyScalar(this.WorldView.Atlas.TileWidthR3);
        let c = this.WorldView.MasterMap.Area.Grid.GetCellForPoint_WorldR3(this.Center.clone().add(n));

        //Check to see if neighbor cell is blocked.
        if (c) {
          if (this.checkCollision(c)) {
            if (this._hitSoundTimer.ready()) {
              Globals.audio.play(Files.Audio.HitWall, this.Center);
              this._hitSoundTimer.reset();
            }

            this.SpeedMultiplier = this._hitSoundTimer.interval;
          }
          else {
            this._bMoving = true;
            this._eMoveDirection = this._eCommandedDirection;
            this._startPosition = this.Position.clone();
            this._destination = new vec3(c.CellPos_World.x, c.CellPos_World.y, 0);
          }
        }
        else {
          this._bMoving = false;
        }

        this.playMovementAnimation(this._eCommandedDirection);//don't use the move direction

        this._eCommandedDirection = Direction4Way.None;
        return true;
      }
    }
    else {
      if (!this._bMoving) {
        this.stopMovementAnimation();
      }
    }

    return false;
  }
  public face(dir: Direction4Way) {
    //face a certain direction.
    let a = Character.getAnimationNameForMovementDirection(dir);
    this.Animation.setKeyFrame(0, a, true);
  }
  public static getAnimationNameForMovementDirection(dir: Direction4Way): string {
    if (dir === Direction4Way.Left) {
      return "move_left";
    }
    else if (dir === Direction4Way.Right) {
      return "move_right";
    }
    else if (dir === Direction4Way.Up) {
      return "move_up";
    }
    else if (dir === Direction4Way.Down) {
      return "move_down"
    }
    Globals.logError('Inavlid direction supplied to getAnimationNameForMovementDirection');
    return "invalid";
  }
  public static getMovementNormalForDirection(dir: Direction4Way): vec3 {
    let n: vec3 = null;
    if (dir === Direction4Way.Down) {
      n = WorldView25D.DownR3Grid.clone();
    }
    else if (dir === Direction4Way.Up) {
      n = WorldView25D.DownR3Grid.clone().multiplyScalar(-1);
    }
    else if (dir === Direction4Way.Right) {
      n = WorldView25D.RightR3.clone();
    }
    else if (dir === Direction4Way.Left) {
      n = WorldView25D.RightR3.clone().multiplyScalar(-1);
    }
    return n;
  }


}
export class Viewport25D {
  private _widthPixels: number = 0;
  private _tilesWidth: number = 0;
  private _heightPixels: number = 0;
  private _tilesHeight: number = 0;
  private _boxR2: Box2f = new Box2f();
  private _boxR3: Box2f = new Box2f();
  public Center: vec3 = new vec3(0, 0, 0);

  public get WidthPixels(): number { return this._widthPixels; }
  public get HeightPixels(): number { return this._heightPixels; }
  public get TilesWidth(): number { return this._tilesWidth; }
  public get TilesHeight(): number { return this._tilesHeight; }
  public get BoxR2(): Box2f { return this._boxR2; }
  public get BoxR3(): Box2f { return this._boxR3; }

  private _box3helper: Box3Helper = null;

  public constructor() {
  }
  private widthHeightUpdate(dt: number) {
    let dist = new vec3();
    Globals.player.getWorldPosition(dist);

    let ar = Globals.screen.elementHeight / Globals.screen.elementWidth;
    let fov = THREE.Math.degToRad(Globals.camera.getEffectiveFOV());
    let tan_fov_2 = Math.tan(fov * 0.5);

    //2 A * tan(fov/2) * tile_w = tiles width
    this._tilesWidth = tan_fov_2 * Math.abs(dist.z) * g_atlas.TileWidthR3;
    this._tilesHeight = tan_fov_2 * Math.abs(dist.z) * g_atlas.TileHeightR3 * ar;

    this._widthPixels = this._tilesWidth * g_atlas.TileWidthPixels;
    this._heightPixels = this._tilesHeight * g_atlas.TileHeightPixels;
  }

  public update(dt: number) {
    this.widthHeightUpdate(dt);
    let tw = this.TilesWidth;
    let th = this.TilesHeight;

    this._boxR3 = new Box2f();
    this._boxR3.Min.x = this.Center.x - tw;
    this._boxR3.Min.y = this.Center.y - th;
    this._boxR3.Max.x = this.Center.x + tw;
    this._boxR3.Max.y = this.Center.y + th;

    this._boxR2 = new Box2f();
    this._boxR2.Min.x = this._boxR3.Min.x;
    this._boxR2.Max.x = this._boxR3.Max.x;

    this._boxR2.Min.y = -this._boxR3.Max.y;
    this._boxR2.Max.y = -this._boxR3.Min.y;

    if (Globals.isDebug()) {
      if (this._box3helper !== null) {
        Globals.scene.remove(this._box3helper);
      }
      let zzz = 0.01;
      let b: Box3 = new Box3(new vec3(this._boxR3.Min.x, this._boxR3.Min.y, zzz), new vec3(this._boxR3.Max.x, this._boxR3.Max.y, zzz));
      this._box3helper = new Box3Helper(b, new THREE.Color(1, 0, 1));
      Globals.scene.add(this._box3helper);

    }
  }
}
class InputControls {
  //Handles the movement of the player with controls, KB,Mouse or VR controllers (in the future, hands)

  private _playerChar: Character = null;
  private _playerCharZoom: number = 13;
  private _viewport: Viewport25D = null;

  public get PlayerChar(): Character { return this._playerChar; }

  public constructor(playerChar: Character, viewport: Viewport25D) {
    this._playerChar = playerChar;
    this._viewport = viewport;
  }
  public update(dt: number) {
    if (Globals.input.mouse.Right.pressOrHold()) {
      this.movePlayer(dt);
      this.centerViewportWhileFlying();
    }
    else {
      this.movePlayerChar();
      this.zoomPlayerChar();
      this.lookAtPlayerChar();
    }
  }
  private centerViewportWhileFlying() {
    //This simply re-centers the viewport to see another area of the world.
    let player_n = new vec3();
    Globals.player.getWorldDirection(player_n);

    let player_p = new vec3();
    Globals.player.getWorldPosition(player_p);

    let p1 = player_p.clone();
    let p2 = player_p.clone().add(player_n.clone().multiplyScalar(1000));
    let center = g_mainWorld.MasterMap.project(p1, p2, WorldView25D.Normal, g_mainWorld.position);

    this._viewport.Center = center;
  }
  private movePlayer(dt: number) {
    //This moves the player (the person) not the spite character
    let player = Globals.player;
    let spd = 12;
    let amtstr = spd * Globals.input.MovementController.Axis.x * dt;
    if (amtstr !== 0) {
      let r: vec3 = Globals.frustum.CamDir.clone().cross(new vec3(0, 1, 0)).normalize();
      player.position.add(r.multiplyScalar(amtstr));
    }

    let amtfw: number = spd * Globals.input.MovementController.Axis.y * dt;
    if (amtfw !== 0) {
      let n: vec3 = Globals.frustum.CamDir.clone();
      player.position.add(n.multiplyScalar(amtfw));
    }
    if (amtfw !== 0 || amtstr !== 0) {
      Globals.frustum.construct();
    }
  }
  public lookAtPlayerChar() {
    let c: vec2 = this._playerChar.BoundBox_World.Center();
    let center = new vec3(c.x, c.y, this._playerChar.Position.z);

    center.add(g_mainWorld.position);//Not sure if we're actually going to move the world but it's possible i guess

    let position = center.clone().add(this._playerChar.QuadNormal.clone().multiplyScalar(this._playerCharZoom));

    Globals.player.position.copy(position);

    //If in VR the user may not have to look at this exact thing.
    Globals.camera.lookAt(center);
    Globals.frustum.construct();

    this._viewport.Center = center;
  }
  private zoomPlayerChar() {
    let zoomPerWheel = 0.1;
    let maxZoom: number = 200;
    let minZoom: number = 3;

    if (Globals.isDebug()) {
      maxZoom = 9999;
    }

    if (Globals.input.mouse.Wheel !== 0) {
      this._playerCharZoom += Globals.input.mouse.Wheel * zoomPerWheel;
      this._playerCharZoom = Math.max(minZoom, Math.min(maxZoom, this._playerCharZoom));
      this.lookAtPlayerChar();
    }
  }

  private movePlayerChar() {
    if (Globals.input.keyboard.Shift.pressOrHold()) {
      if (Globals.isDebug()) {
        this.PlayerChar.SpeedMultiplier = 20;
      }
      else {
        this.PlayerChar.SpeedMultiplier = 2;

      }
    }
    else {
      this.PlayerChar.SpeedMultiplier = 1;
    }
    if (Globals.input.MovementController.MoveLeft) {
      this.PlayerChar.move(Direction4Way.Left);
    }
    else if (Globals.input.MovementController.MoveRight) {
      this.PlayerChar.move(Direction4Way.Right);
    }
    else if (Globals.input.MovementController.MoveUp) {
      this.PlayerChar.move(Direction4Way.Up);
    }
    else if (Globals.input.MovementController.MoveDown) {
      this.PlayerChar.move(Direction4Way.Down);
    }
    else {
      this.PlayerChar.move(Direction4Way.None);
    }
  }
}
export class WorldView25D extends Object3D {
  //*Note the difference between downR3 World and Grid.  The TileGrid's down is opposite.
  public static readonly DownR3Grid: vec3 = new vec3(0, 1, 0);
  public static readonly DownR3World: vec3 = new vec3(WorldView25D.DownR3Grid.x, WorldView25D.DownR3Grid.y * -1 /*Look here, see don't miss this*/, 0);
  public static readonly RightR3: vec3 = new vec3(1, 0, 0);
  public static readonly Normal: vec3 = new vec3(0, 0, 1);
  public static readonly LayerDepth: number = 0.01;

  private _atlas: Atlas = null;
  private _buffer: TileBuffer = null;
  private _boxHelper: THREE.BoxHelper = null;
  private _mesh: THREE.Mesh = null;
  private _objects: Map<Sprite25D, Sprite25D> = new Map<Sprite25D, Sprite25D>(); // Objects that do not update.
  private _destroyed: Map<Sprite25D, Sprite25D> = new Map<Sprite25D, Sprite25D>();
  private _playerchar: Character = null;
  private _viewport: Viewport25D = null;
  private _viewportCellsFrame: Array<Cell> = null;
  private _masterMap: MasterMap = null;
  private _inputControls: InputControls = null;

  private _environment: Environment = null;

  private _quickUI: QuickUI = null;

  public get InputControls(): InputControls { return this._inputControls; }
  public set InputControls(x: InputControls) { this._inputControls = x; }
  public get Atlas(): Atlas { return this._atlas; }
  public get Buffer(): TileBuffer { return this._buffer; }
  public get MasterMap(): MasterMap { return this._masterMap; }
  public set Player(p: Character) { this._playerchar = p; }
  public get Player(): Character { return this._playerchar; }
  public get Viewport(): Viewport25D { return this._viewport; }
  public get Environment(): Environment { return this._environment; }

  private _spriteSheetMaterial: MeshBasicMaterial = null;
  public get SpriteSheetMaterial(): MeshBasicMaterial { return this._spriteSheetMaterial; }

  public constructor(r: Atlas) {
    super();
    this._atlas = r;
  }
  public init(bufSizeTiles: Int) {
    //6 high x 16 wide
    this._viewport = new Viewport25D();

    //This is where the most of the level processing happens.
    //hold onto your butts.
    this._masterMap = new MasterMap(g_atlas);

    this._buffer = new TileBuffer(bufSizeTiles * 4, this);

    this._spriteSheetMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff
      , side: THREE.DoubleSide
      , map: this.Atlas.Texture
      , vertexColors: THREE.VertexColors
      , flatShading: false
      , transparent: true// false //true //This is used for the tree shadows.
      , wireframe: false
      , alphaTest: 0.01 // Quickly cut out shitty transparency
      //blending - if we really do end up with blended keyframes we can add this, but right now it's messing stuff up
      //, blending: THREE.MultiplyBlending // or Normalblending (unsure)
    });

    this._mesh = new THREE.Mesh(this._buffer, this._spriteSheetMaterial);

    this.add(this._mesh);

    //Must be called after spritemap load
    this._quickUI = new QuickUI(this);

    let spr = g_mainWorld.MasterMap.MapData.Sprites.getSpriteByName("ui_title");
    let bounds :Box2f = spr.getTileBounds();
    this._quickUI.Elements.push(new UIElement(this._quickUI, bounds.Min.x, bounds.Min.y, bounds.Width(), bounds.Height()));

    //Must be called after spritemap load
    this._environment = new Environment(this);
  }
  public update(dt: number) {
    this.updateViewport(dt);
    this.InputControls.update(dt);
    this._quickUI.update();

    if (Globals.gameState === GameState.Play) {
      this.updateMapAndObjects(dt);
    }

    //Copy Render Data
    this.copySprites();

    //Box
    if (Globals.isDebug()) {
      if (this._boxHelper !== null) {
        this.remove(this._boxHelper);
      }
      this._boxHelper = new THREE.BoxHelper(this._mesh, new THREE.Color(0xffff00));
      this.add(this._boxHelper);
    }
  }
  private copySprites() {
    this._buffer.beginCopy();

    if (Globals.gameState === GameState.Play) {
      // if (Globals.isDebug()) {
      //   this.debug_DrawCells();
      // }
      this.drawEverything();
    }
    else if (Globals.gameState === GameState.Title) {
      this._quickUI.draw();
    }

    this._buffer.endCopy();
  }
  private updateMapAndObjects(dt: number) {
    //Update map tile sprites
    this.MasterMap.update(dt);
    this.Environment.update(dt);

    //Update Objects
    for (const [key, value] of this._objects) {
      //There may be a faster way to do this. For instance, static objects don't update.
      key.update(dt);
    }

    this.updatePostPhysics();
  }
  public addObject25(ob: Sprite25D, cell_position: ivec2 = null) {
    if (ob.Destroyed === false) {
      ob.WorldView = this;
      this._objects.set(ob, ob);
      ob.markDirty();
      if (cell_position) {
        this.warpObject(ob, cell_position);
      }
    }
  }
  public warpObject(ob: Sprite25D, cell_pos: ivec2) {
    //Set the object to be at a position, regardless of what is there.
    if (!this._objects.get(ob)) {
      Globals.logError("Could not warp object, object was not added tow orld.")
    }
    else {
      ob.Position.x = cell_pos.x * this.Atlas.TileWidthR3;
      ob.Position.y = cell_pos.y * this.Atlas.TileHeightR3;
    }
  }
  public removeObject25(ob: Sprite25D) {
    if (ob.Destroyed === false) {
      ob.WorldView = null;
      this._objects.delete(ob);
    }
  }
  public destroyObject25(ob: Sprite25D) {
    this._destroyed.set(ob, ob);
    ob.Destroyed = true;
  }

  private copyObjectTiles(ob: Sprite25D) {
    let depth = this.getLayerDepth(ob.Layer);
    this._buffer.copyObjectTile(ob, depth);
    ob.clearDirty();

    for (let ci = 0; ci < ob.Children.length; ci++) {
      this.copyObjectTiles(ob.Children[ci]);
    }
  }
  private copyCellTiles(cell: Cell, ob: Sprite25D, frame: Int, depth: number, block: TileBlock) {
    //You can override tile layer depth by setting the layer manually on the sprite.
    depth = (ob.Layer === TileLayerId.Unset ? depth : this.getLayerDepth(ob.Layer));
    this._buffer.copyCellTile(cell, ob, frame, depth, block);
    ob.clearDirty();

    for (let ci = 0; ci < ob.Children.length; ci++) {
      this.copyCellTiles(cell, ob.Children[ci], frame, depth, block);
    }
  }
  private updateViewport(dt: number) {
    if (!this.Player) {
      Globals.debugBreak();
    }
    this._viewport.update(dt);
  }
  private updatePostPhysics() {
    this._viewportCellsFrame = this._masterMap.Area.Grid.GetCellManifoldForBox(this._viewport.BoxR2)
  }
  // private debug_DrawCells() {
  //   for (let c of this._viewportCellsFrame) {
  //     if (c) {
  //       this.debug_drawCell(c);
  //     }
  //   }

  // }
  // private debug_drawCell(c: Cell) {
  //   if (Cell.DebugFrame === null) {
  //     Cell.DebugFrame = this.Atlas.getFrame(2 as Int, 0 as Int);
  //   }

  //   this._buffer.copyCellTile(Cell.DebugFrame, c.DebugVerts, WorldView25D.Normal, new vec4(c.DebugColor.r, c.DebugColor.g, c.DebugColor.b, 1), 1, false, false, DirtyFlag.All);
  // }
  private drawEverything() {
    this.drawTiles();
    //Draw Objects
    for (const [key, value] of this._objects) {
      if (key.Visible) {
        //There may be a faster way to do this. For instance, static objects don't update.
        this.copyObjectTiles(key);
      }
    }
  }
  private drawTiles() {
    for (let c of this._viewportCellsFrame) {
      if (c) {
        for (let block of c.Blocks) {
          if (block) {
            if (block.SpriteRef) {
              this.drawBlock(c, block);
            }
          }
        }
      }
    }
  }
  private drawBlock(c: Cell, block: TileBlock) {
    let frame = block.FrameIndex;
    if (block.SpriteRef.TilingAnimated) {
      //Perform special animation
      frame = block.SpriteRef.Animation.CurrentFrameIndex;
    }

    this.copyCellTiles(c, block.SpriteRef, frame, this.getLayerDepth(block.Layer), block);
  }
  private getLayerDepth(layer: TileLayerId): number {
    let ret = (layer as number) * WorldView25D.LayerDepth;
    return ret;
  }
  public grabTileOrSprite(tickler: Tickler): Sprite25D {
    let ret: Sprite25D = null;

    //Grap Tile Sprite.
    let ap_world = tickler.getActionPointLocation();
    if (ap_world) {
      let ap_map = this.MasterMap.worldPointToMapPoint(ap_world);

      let c: Cell = this.MasterMap.Area.Grid.GetCellForPoint_WorldR3(ap_map);
      if (c !== null) {
        let blocks: TileBlock[] = c.getOrderedBlockArrayTopDown();
        if (blocks.length > 0) {
          if (blocks[0].SpriteRef) {

            //Grab the Block
            if (blocks[0].SpriteRef.Gesture === HandGesture.Grab) {

              ret = this.blockTileToSprite(blocks[0], c);

              ret.R3Parent = tickler.ActionPoint;
              tickler.Held = ret;

              Globals.audio.play(Files.Audio.HandGrab, this.position);

            }

            //Do callback if needed
            if (blocks[0].SpriteRef.GestureCallback) {
              blocks[0].SpriteRef.GestureCallback(blocks[0].SpriteRef, blocks[0], tickler);
            }

          }

        }
      }
    }
    else {
      Globals.logError("Could not find action point for tickler.");
    }
    return ret;
  }
  public blockTileToSprite(block: TileBlock, cell: Cell): Sprite25D {
    let ret: Sprite25D = block.SpriteRef.clone();

    ret.Animation.setKeyFrame(block.FrameIndex, block.AnimationData.Name);

    g_mainWorld.addObject25(ret, null);

    cell.removeBlock(block);

    return ret;
  }


}
export class TileBuffer extends THREE.BufferGeometry {
  private _bufferSizeTiles: number = 0;

  private _vsiz: number = 3;
  private _nsiz: number = 3;
  private _csiz: number = 4;
  private _tsiz: number = 2;

  private _view: WorldView25D = null;

  private _attrPosition: THREE.BufferAttribute;
  private _attrNormal: THREE.BufferAttribute;
  private _attrColor: THREE.BufferAttribute;
  private _attrTexture: THREE.BufferAttribute;

  private _usedBufferLengthTiles = 0;

  private _updFlags: number = 0;


  private _vert_floats: Float32Array = null;
  private _norms_floats: Float32Array = null;
  private _colors_floats: Float32Array = null;
  private _uvs_floats: Float32Array = null;

  //Custom shaders
  //https://bl.ocks.org/duhaime/c8375f1c313587ac629e04e0253481f9
  //Updateing buffers
  //https://threejs.org/docs/#manual/en/introduction/How-to-update-things
  public constructor(numtiles: number, view: WorldView25D) {
    super();
    this._view = view;
    this.allocate(numtiles);
  }
  public allocate(numTiles: number) {
    this._bufferSizeTiles = numTiles;

    this.setDrawRange(0, 0);

    let verts: Float32Array = new Float32Array(numTiles * 4 * this._vsiz);
    let norms: Float32Array = new Float32Array(numTiles * 4 * this._nsiz);
    let colors: Float32Array = new Float32Array(numTiles * 4 * this._csiz);
    let texs: Float32Array = new Float32Array(numTiles * 4 * this._tsiz);

    //Sets colors + normals to default.
    this.fillDefault(verts, texs, norms, colors);

    this._attrPosition = new THREE.BufferAttribute(verts, this._vsiz);
    this._attrNormal = new THREE.BufferAttribute(norms, this._nsiz);
    this._attrColor = new THREE.BufferAttribute(colors, this._csiz);
    this._attrTexture = new THREE.BufferAttribute(texs, this._tsiz);

    this._attrPosition.setDynamic(true);
    this._attrNormal.setDynamic(true);
    this._attrColor.setDynamic(true);
    this._attrTexture.setDynamic(true);

    this.addAttribute('position', this._attrPosition);
    this.addAttribute('normal', this._attrNormal);
    this.addAttribute('color', this._attrColor);
    this.addAttribute('uv', this._attrTexture);

    //Does this make it faster
    this._vert_floats = (this._attrPosition.array as Float32Array);
    this._norms_floats = (this._attrNormal.array as Float32Array);
    this._colors_floats = (this._attrColor.array as Float32Array);
    this._uvs_floats = (this._attrTexture.array as Float32Array);

    //Threejs uses CCW default winding https://threejs.org/docs/#api/en/constants/Renderer
    let indexes = new Array<number>/*Int16Array*/(numTiles * 6);
    for (let ii = 0, tt = 0; ii < numTiles * 6; ii += 6) {
      let tvoff = ii / 6 * 4;

      indexes[ii + 0] = tvoff + 0;
      indexes[ii + 1] = tvoff + 2;
      indexes[ii + 2] = tvoff + 1;

      indexes[ii + 3] = tvoff + 1;
      indexes[ii + 4] = tvoff + 2;
      indexes[ii + 5] = tvoff + 3;
    }

    this.setIndex(indexes);
  }
  public beginCopy() {
    this._updFlags = 0;
    this._usedBufferLengthTiles = 0; //reset
  }
  // private _didUpdateNormsAndColors = false;
  public endCopy() {
    let p: boolean = true; //From now on always update tile transform (since tiles will almost always be needing update)
    let n: boolean = (this._updFlags & DirtyFlag.Normals) > 0;
    let c: boolean = (this._updFlags & DirtyFlag.Colors) > 0;
    let t: boolean = (this._updFlags & DirtyFlag.UVs) > 0;

    this._attrPosition.needsUpdate = p;
    this._attrTexture.needsUpdate = t;

    //**Due to slow performance Disabling color + normal udpates.
    // if (this._didUpdateNormsAndColors === false) {
    //   this._didUpdateNormsAndColors = true;
    // this._attrNormal.needsUpdate = n;
    // this._attrColor.needsUpdate = c;
    // }

    //https://gamedev.stackexchange.com/questions/88031/keeping-sprites-nice-and-pixelated

    this.updateBufferRange();

    //**this is also very slow 
    //this.computeBoundingBox();

    //This is in fact very slow.
    //this.computeBoundingSphere(); 
  }
  private _debugNumCopies = 0;
  public copyObjectTile(tile: Sprite25D, depth: number) {
    tile.calcQuadVerts();

    if (tile.Animation.Frame) {
      if (tile.Animation.Frame2 && tile.Animation.FrameBlend > 0.0001) {
        this.copyTileFrame(tile, tile.Animation.Frame, tile.Animation.FrameBlend, null, depth);
        this.copyTileFrame(tile, tile.Animation.Frame2, 1 - tile.Animation.FrameBlend, null, depth);
      }
      else {
        this.copyTileFrame(tile, tile.Animation.Frame, 1, null, depth);
      }
    }
    else {
      //Error.
      Globals.debugBreak();
    }
  }
  public copyCellTile(cell: Cell, tile: Sprite25D, frame: Int, depth: number, block: TileBlock) {
    if (!tile.QuadVerts || tile.QuadVerts.length < 4) {
      tile.calcQuadVerts();
    }
    //Copy a static Tile Sprite
    if (tile.Animation.TileData && tile.Animation.TileData.KeyFrames.length > frame) {
      this.copyTileFrame(tile, tile.Animation.TileData.KeyFrames[frame].Frame, 1, cell, depth, block);
    }
    else {
      //Error.
      Globals.debugBreak();
    }
  }
  public copyTileFrame(tile: Sprite25D, frame: SpriteFrame, blend: number = 1, cell: Cell = null, depth: number = -1, block: TileBlock = null) {
    let v: Array<vec3> = new Array<vec3>(4);
    let flags = tile.DirtyFlags;
    if (blend) {
      flags |= DirtyFlag.Colors;
    }
    if (cell) {
      flags |= DirtyFlag.UVs;
      flags |= DirtyFlag.Normals;
      flags |= DirtyFlag.Colors;
    }
    /*
    0 --- 1
    |     |
    2 --- 3
    */
    if (cell) {
      //An attempt to speed this method up.
      if (block.Verts.length < 4) {
        block.Verts[0] = tile.QuadVerts[0].clone();
        block.Verts[1] = tile.QuadVerts[1].clone();
        block.Verts[2] = tile.QuadVerts[2].clone();
        block.Verts[3] = tile.QuadVerts[3].clone();

        let cp: vec2 = new vec2(cell.TilePosR3.x, cell.TilePosR3.y * -1); //-1 for the "down" here.  Too lazy to multiply by the normals.
        for (let vi = 0; vi < 4; ++vi) {
          block.Verts[vi].x += cp.x;
          block.Verts[vi].y += cp.y;
        }
      }
      v = block.Verts;
    }
    else {
      v[0] = tile.QuadVerts[0].clone();
      v[1] = tile.QuadVerts[1].clone();
      v[2] = tile.QuadVerts[2].clone();
      v[3] = tile.QuadVerts[3].clone();
    }


    //If we have an object parent then we're relative to that instead.
    if (tile.R3Parent === null) {
      for (let vi = 0; vi < 4; ++vi) {
        v[vi].z = depth;
      }
    }

    this.copyFrameQuad(frame, v, tile.QuadNormal, tile.WorldColor, blend, tile.FlipH, tile.FlipV, flags);
  }
  public copyFrameQuad(frame: SpriteFrame, v: Array<vec3>, normal: vec3, color: vec4, blend: number, fliph: boolean, flipv: boolean, flags: number = DirtyFlag.All) {
    let off = this._usedBufferLengthTiles * 4;

    this._updFlags |= flags;

    // let verts: Float32Array = (this._attrPosition.array as Float32Array);
    // let norms: Float32Array = (this._attrNormal.array as Float32Array);
    // let colors: Float32Array = (this._attrColor.array as Float32Array);
    // let uvs: Float32Array = (this._attrTexture.array as Float32Array);

    for (let vi = 0; vi < 4; ++vi) {
      let vv = off + vi;

      this._vert_floats[vv * this._vsiz + 0] = v[vi].x;
      this._vert_floats[vv * this._vsiz + 1] = v[vi].y;
      this._vert_floats[vv * this._vsiz + 2] = v[vi].z;

      //Removed colors and normals because buffersubdata is getting slow.
      //   if (flags & DirtyFlag.Normals) {
      // norms[vv * this._nsiz + 0] = normal.x;//this._view.Normal.x;
      // norms[vv * this._nsiz + 1] = normal.y;
      // norms[vv * this._nsiz + 2] = normal.z;
      //    }
      //    if (flags & DirtyFlag.Colors) {
      // colors[vv * this._csiz + 0] = color.x;
      // colors[vv * this._csiz + 1] = color.y;
      // colors[vv * this._csiz + 2] = color.z;
      // colors[vv * this._csiz + 3] = color.w * blend;
      //     }
    }

    //  if (flags & DirtyFlag.UVs) {
    if (frame) {
      this.copyFrameUVs(frame, fliph, flipv, off);
    }
    //  }

    this._debugNumCopies++;
    this._usedBufferLengthTiles++;
  }
  private copyFrameUVs(frame: SpriteFrame, fliph: boolean, flipv: boolean, off: number) {
    let f = frame;
    let x0 = f.x;
    let y0 = f.y;
    let x1 = f.x + f.w;
    let y1 = f.y + f.h;

    if (fliph) {
      let t = x0;
      x0 = x1;
      x1 = t;
    }
    if (flipv) {
      let t = y0;
      y0 = y1;
      y1 = t;
    }

    this._uvs_floats[off * 2 + 0] = x0;
    this._uvs_floats[off * 2 + 1] = y1;
    this._uvs_floats[off * 2 + 2] = x1;
    this._uvs_floats[off * 2 + 3] = y1;
    this._uvs_floats[off * 2 + 4] = x0;
    this._uvs_floats[off * 2 + 5] = y0;
    this._uvs_floats[off * 2 + 6] = x1;
    this._uvs_floats[off * 2 + 7] = y0;
  }
  private fillDefault(vb: Float32Array, tb: Float32Array, nb: Float32Array, cb: Float32Array) {
    for (let vi = 0; vi < vb.length; ++vi) {
      vb[vi + 0] = 0;
      vb[vi + 1] = 0;
      vb[vi + 2] = 0;

      vb[vi + 3] = 1;
      vb[vi + 4] = 0;
      vb[vi + 5] = 0;

      vb[vi + 6] = 0;
      vb[vi + 7] = -1;
      vb[vi + 8] = 0;

      vb[vi + 9] = 1;
      vb[vi + 10] = -1;
      vb[vi + 11] = 0;

      tb[vi + 0] = 0;
      tb[vi + 1] = 1;
      tb[vi + 2] = 1;
      tb[vi + 3] = 1;
      tb[vi + 4] = 0;
      tb[vi + 5] = 0;
      tb[vi + 6] = 1;
      tb[vi + 7] = 0;

      for (let xx = 0; xx < 4; ++xx) {
        nb[vi + xx * 3 + 0] = 0;
        nb[vi + xx * 3 + 1] = 0;
        nb[vi + xx * 3 + 2] = 1;
        cb[vi + xx * 4 + 0] = 1;
        cb[vi + xx * 4 + 1] = 0;
        cb[vi + xx * 4 + 2] = 1;
        cb[vi + xx * 4 + 3] = 1;
      }
    }

    //Draw first quad to test.
    this.setDrawRange(0, 6);
  }
  private updateBufferRange() {
    if (this._usedBufferLengthTiles > 0) {
      this.setDrawRange(0, this._usedBufferLengthTiles * 6);
    }
    else {
      this.setDrawRange(0, 6);
    }
  }
}
export enum HandGesture { None = 0x00, Grab = 0x01, Poke = 0x02 }
export class Tickler extends PhysicsObject3D {
  public Gesture: HandGesture = HandGesture.None;
  public Grabbed: Sprite25D = null;
  // public get ActionPoint (): Object3D {return this._actionPoint;}
  private _actionPoint: Object3D = null;

  public Held: Sprite25D = null;

  public get ActionPoint(): Object3D { return this._actionPoint; }

  public constructor(model: Object3D, action_point: Object3D) {
    super();
    this.add(model);
    // this.add(action_point);

    this._actionPoint = action_point;
  }
  public snapToTile(tile: TileBlock) {

  }
  public getActionPointLocation(): vec3 {
    if (this._actionPoint) {
      let v: vec3 = new vec3();
      this._actionPoint.getWorldPosition(v);
      return v;
    }
    return null;
  }
  public update(dt: number) {
    super.update(dt);

    //Update position
    if (Globals.userIsInVR()) {
      this.position.copy(Globals.input.right.Position);
    }
    else {
      let hand_pos_final: vec3 = null;
      if (Globals.input.mouse.Right.pressOrHold()) {
        //Player is moving.
        hand_pos_final = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, 4);
      }
      else {
        //Project the hand onto the world.  This is for PC only. 
        let p1 = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, 0);
        let p2 = Globals.screen.project3D(Globals.input.mouse.x, Globals.input.mouse.y, 100);
        let projected_world = g_mainWorld.MasterMap.project(p1, p2, WorldView25D.Normal, g_mainWorld.position);

        //Push the hand out a little bit so it isn't stuck in the world.
        let push_amt: number = 1.9;
        let push_out = p1.clone().sub(p2).normalize().multiplyScalar(push_amt);

        hand_pos_final = projected_world.clone().add(push_out);
      }
      //hardcode the z to a solid position so we can easily project it.
      this.position.copy(hand_pos_final);
    }

    if (this.Held === null) {
      //Grab stuff
      if (Globals.input.mouse.Left.pressed()) {
        this.Gesture = HandGesture.Grab;
        this.Grabbed = g_mainWorld.grabTileOrSprite(this);
      }
      else {
        this.Gesture = HandGesture.None;
      }
    }
    else {

      if (Globals.input.mouse.Left.releaseOrUp()) {
        //Essentially this would work best if we used a PhysicsObject with velocity and gravity.
        this.Held.R3Parent = null;
        this.Held = null;
        this.Gesture = HandGesture.None;
        if (Globals.input.mouse.Left.released()) {
          Globals.audio.play(Files.Audio.HandRelease, this.position);
        }
      }
    }

  }
}
export class UIElement {
  //A simple texture that we got from the tile map
  private _frame: SpriteFrame = null;
  public get Frame(): SpriteFrame { return this._frame; }
  public Verts: Array<vec3> = new Array<vec3>();
  public Depth: number = 0.01;
  private _ui: QuickUI = null;

  //For now we're just going to use textures
  public constructor(ui: QuickUI, frame_x: number, frame_y: number, frame_width: number, frame_height: number) {
    this._ui = ui;
    this._frame = ui.WorldView.Atlas.getFrame(frame_x as Int, frame_y as Int, frame_width as Int, frame_height as Int);
  }
  public update(parent_depth: number) {
    //hard coding title screen here.

    let rot: Quaternion = new Quaternion(1, 1, 1, 1);
    let scale: vec2 = new vec2(1, 1);
    let widthR3 = 1;
    let heightR3 = 1;
    let depth = parent_depth + this.Depth;



    let ar = Globals.screen.elementHeight / Globals.screen.elementWidth;
    let fov = THREE.Math.degToRad(Globals.camera.getEffectiveFOV());
    let sin_fov_2 = Math.sin(fov * 0.5);
    let dist = (this._frame.tile_width_tiles * 0.5) / sin_fov_2;
    //let delta_dist = Globals.player.position.z - dist;

    //  let normal = new vec3();
    //  Globals.camera.getWorldDirection(normal);
    // let down = new vec3();
    // down = Globals.camera.up.clone().multiplyScalar(-1);

    // let right = new vec3();
    // right = down.clone().cross(normal);

    //  let campos = new vec3();
    //  Globals.player.getWorldPosition(campos);

    let delta = Globals.frustum.ftl.clone().sub(Globals.frustum.ntl);
    let pos: vec3 = Globals.frustum.ntl.clone().add(delta.normalize().multiplyScalar(dist));

    //let pos: vec3 = new vec3(this._ui.WorldView.Viewport.BoxR2.Min.x, this._ui.WorldView.Viewport.BoxR2.Min.y, 0);

    SpriteFrame.createQuadVerts(this.Verts, pos, rot, scale, this._frame.tile_width_tiles, this._frame.tile_height_tiles,
      Globals.frustum.right.clone(), Globals.frustum.down.clone(), Globals.frustum.normal.clone());

    //compute the distance needed to keep this in the correct distance so it fills the screen.


    // for (let vi = 0; vi < 4; ++vi) {
    //  this.Verts[vi].z = delta_dist;
    // }


    //Add depth ** Do this later for ui elements that are on teh screen...
    // for (let vi = 0; vi < 4; ++vi) {
    //   this.Verts[vi].z = depth;
    // }

  }
}
export class QuickUI {
  private _elements: Array<UIElement> = new Array<UIElement>();
  public get Elements(): Array<UIElement> { return this._elements; }

  public readonly c_base_ui_depth = 0.06;

  private _view: WorldView25D = null;
  public get WorldView(): WorldView25D { return this._view; }
  public constructor(view: WorldView25D) {
    this._view = view;
  }
  public update() {

    for (let elem of this._elements) {
      elem.update(this.c_base_ui_depth);
    }
  }
  public draw() {
    let normal: vec3 = new vec3(0, 0, 1);
    let color: vec4 = new vec4(1, 1, 1, 1);

    for (let elem of this._elements) {
      this._view.Buffer.copyFrameQuad(elem.Frame, elem.Verts, normal, color, 1, false, false, DirtyFlag.All);
    }
  }
}

let g_ambientlight: THREE.AmbientLight = null;
let axis: THREE.AxesHelper = null;
let gridhelper: THREE.GridHelper = null;
let g_hand: Tickler = null;

let g_atlas: Atlas = null;
let g_mainWorld: WorldView25D = null;
let g_bAssetsLoaded: boolean = false;

$(document).ready(function () {
  Globals.setFlags(document.location);

  Globals.init(800, 800, ResizeMode.FitAndCenter); //Gameboy pixel dims
  Globals.prof.frameStart();

  loadResources();
});


function loadResources() {
  //https://threejs.org/docs/#manual/en/introduction/Animation-system

  // this should really be handled by a promise.
  g_atlas = new Atlas(
    1 as Int, 1 as Int, 1 as Int, 1 as Int,
    1 as Int, 1 as Int,
    16 as Int, 16 as Int, './dat/img/tiles.png', function (that: ImageResource) {
      //Load the hnad
      Globals.models.loadModel(Files.Model.Hand, ['Armature', 'Action_Point'], function (success: boolean, arr: Array<Object3D>, gltf: any): THREE.Object3D {
        if (success) {
          if (arr.length === 2) {
            let hand: Object3D = arr[0];
            let action_point: Object3D = arr[1];

            createTickler(hand, action_point);

            return arr[0];
          }
        }
        return null;
      })




    });
  Globals.models.setModelAsyncCallback(Files.Model.Hand, function (model: THREE.Mesh) {
    initializeGame();
    g_bAssetsLoaded = true;
  });
}
function createTickler(model: Object3D, action_point: Object3D) {
  //Apply Hand Transforms.
  //Note: We might be able to swap left/right here.
  model.rotateY(Math.PI);

  g_hand = new Tickler(model, action_point);
  g_hand.scale.set(3, 3, 3);
}
function initializeGame() {
  createWorld();

  g_ambientlight = new THREE.AmbientLight(new Color(1, 1, 1));
  Globals.scene.add(g_ambientlight);

  if (Globals.isDebug()) {
    axis = new THREE.AxesHelper(2);
    Globals.scene.add(axis);
    gridhelper = new THREE.GridHelper(100, 30, new THREE.Color(1, 0.6, 1), new THREE.Color(0.6, 1, 1))
    Globals.scene.add(gridhelper);
  }

  Globals.prof.frameEnd();
  $('#outPopUp').hide();



  Globals.startGameEngine(gameLoop);
}
function createWorld() {
  //Load Resources
  g_mainWorld = new WorldView25D(g_atlas);
  g_mainWorld.init(2048 as Int);
  Globals.scene.add(g_mainWorld);

  let playerTile = g_mainWorld.MasterMap.MapData.Sprites.getPlayerTile();
  let player: Character = (playerTile as Character).clone() as Character;

  let inputControls = new InputControls(player, g_mainWorld.Viewport);
  g_mainWorld.addObject25(player, g_mainWorld.MasterMap.MapData.PlayerStartXY);
  g_mainWorld.Player = player;
  g_mainWorld.InputControls = inputControls;

  player.update(0.0001);
}
function gameLoop(dt: number) {
  Globals.prof.begin("main game loop");

  //Listen for game start
  if (Globals.gameState === GameState.Title) {
    if (Globals.input.right.A.pressed() || Globals.input.right.Trigger.pressed() || Globals.input.left.A.pressed() || Globals.input.left.Trigger.pressed()) {
      Globals.gameState = GameState.Play;

      //You can only play music when the user has interacted wit the page.
      //Globals.audio.playMusic(Files.Audio.MusicBeepy);
    }
  }

  g_mainWorld.update(dt);

  Globals.prof.end("main game loop");
}
