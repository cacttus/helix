
/**
 * @file Prof.ts
 * @author Derek Page
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
import { Globals } from './Globals';
import { Dictionary } from './Base';
import { Utils } from './Utils';

export class ProfFrame {
  private _start_time: number = 0;
  private _end_time: number = 0;
  private _profs: Dictionary<number> = {};
  get start_time(): number { return this._start_time; }
  get end_time(): number { return this._end_time; }
  get profs(): Dictionary<number> { return this._profs; }

  public frameStart() {
    this._start_time = Globals.getTimeMillis();
  }
  public begin(z: string): void {
    let n = Globals.getTimeMillis();
    this._profs[z] = n;
  }
  public end(z: string): void {
    let n = Globals.getTimeMillis();
    this._profs[z] = n - this._profs[z];
  }
  public frameEnd() {
    this._end_time = Globals.getTimeMillis();
  }
}
/**
 * Quick n dirty profiling API.  I was having some trouble with google, and this project is almost due.
 */
export class Prof {
  private _frames: Array<ProfFrame> = new Array<ProfFrame>();
  private _frame: ProfFrame = null;

  private _iLastDumpedFrame = 0;
  private _lastDump: number = 0;
  public DumpRateInSeconds: number = 5;
  public DumpCount: number = 100;
  public TimeSliceInSeconds: number = 1; //  frame profiles are averaged over fixed slices

  public constructor() {
    this._lastDump = Globals.getTimeMillis();
  }
  public begin(z: string): void {
    if (Globals.isProf()) {
      this._frame.begin(z);
    }
  }
  public end(z: string): void {
    if (Globals.isProf()) {
      this._frame.end(z);
    }
  }
  public frameStart() {
    if (Globals.isProf()) {
      this._frame = new ProfFrame();
      this._frame.frameStart();
    }
  }
  public frameEnd() {
    if (Globals.isProf()) {
      this._frame.frameEnd();
      this._frames.push(this._frame);
      this._frame = null;
      let n = (Globals.getTimeMillis() - this._lastDump);
      if (n >= (this.DumpRateInSeconds * 1000)) {
        this.dumpCulprits();
        this._lastDump = Globals.getTimeMillis();

        //**Reset the frames to prevent big memory
        this._frames = new Array<ProfFrame>();
      }
    }
  }
  private dumpCulprits() {
    //Dump frame slice.
    //This is an average of the function times over the range of x seconds.
    let averages: Dictionary<number> = {};
    let nFrames: number = 0;

    if (this._frames) {
      //Ugh, this is such bad programming.  Use a binary tree at least.. c'mon.
      //Well.. this facebook thing is due in 2 days and I'm rushing.
      for (let ifr = 0; ifr < this._frames.length; ifr++) {
        let fr: ProfFrame = this._frames[ifr];
        if (fr.profs) {
          if (fr.start_time >= this._lastDump) {
            for (let key in fr.profs) {
              //todo - if(key in averages)
              if (!(key in averages)) {
                averages[key] = 0;
              }
              averages[key] += fr.profs[key];
            }
          }
          nFrames++;
          this._iLastDumpedFrame++;
        }
      }

      for (let key in averages) {
        averages[key] /= nFrames;
      }

      let output: string = "Slowest perfs in " + nFrames +
        " frames over " + this.DumpRateInSeconds + " seconds:";
      let keys: Array<string> = Utils.getSortedKeys(averages);
      for (let iavg = 1; iavg <= (this.DumpCount > keys.length ? keys.length : this.DumpCount); iavg++) {
        let key = keys[keys.length - iavg];
        let val = averages[key];
        output += "  " + key + ":" + val.toFixed(1) + "ms";
      }

      Globals.logInfo(output);
    }

  }
}
