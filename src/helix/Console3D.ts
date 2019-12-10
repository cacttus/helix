/**
 * @file Console3D.ts
 * @author Derek Page
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
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
