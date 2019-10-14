import * as THREE from 'three';
import { TextCanvas, TextCanvasOptions } from './TextCanvas';
import {Globals}  from './Globals';

export class Console3D extends TextCanvas {
  constructor(){
      let opts: TextCanvasOptions = new TextCanvasOptions();
      opts.Lineheight = opts.Fontsize = Globals.userIsInVR() ? 70 : 50;
      opts.Text = "";
      opts.Width = Globals.userIsInVR() ? 1.5 : 0.1;
      opts.Height = 0.9;
      opts.AutoHeight = false;   
           
      super(opts);

      this.position.set(0,0,0);
      this.showWireframe(Globals.isDebug());
      this.AlignToScreen = true;
      this.ScreenX = 0.0;
      this.ScreenY = 0.0;

      this.Newlines = true;
  }
  public log(e: any): void {
      let str: string = "" + e;
      this.Text += "" + str + '\n';
  }
  public clear() : void {
    this.Text = "";
  }


}
