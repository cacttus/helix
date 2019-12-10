
// /**
//  * @file Dialog.ts
//  * @author Derek Page
//  * @package Helix VR Typescript Game Library

//  * @date 12/8/2019
//  * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//  * 
//  */

// import { vec4, vec2 } from "./Math";
// import {Int, toInt} from "./Int";
// import {MasterMap, Sprite25D} from "./Main"

// class TextBlock {
//   public Color : vec4 = new vec4(1,1,1,1);
//   public Text : string = "";
//   public Pos : vec2 = new vec2(0,0);
//   public Alpha : number = 1.0; // When moving text off the dialog
//   public TextBlock(text:string, pos:vec2, color:vec4) {
//     this.Text = text;
//     this.Pos = pos;
//     this.Color = color;
//   }
// }


// export class Dialog {

//   public Halt :boolean = false;  //Halt player input until done
//   private Text : Array<string> = new Array<string>();//the List<> means that every new string will get a cursor (user needs to press OK).
//   public World : MasterMap = null;
//   public TextCursor : Sprite25D = null;
//   private _fNextChar : number = 0;
//   private _fTextSpeed : number = 0.05; //basic text speed
//   private _fTextSpeedSkip : number = 0.025; // PLayer pressees OK to skip the text
//   private _iChar : Int = toInt(0);
//   private _iMessage : Int = toInt(0);
//   private WaitForUser :boolean = false;
//   //private SpriteFont Font;
//   private vec4 SpecialColor = new vec4(.2f, .721f, .2f, 1); //Highlighted color WEAPON
//   private vec4 SpecialColor2 = new vec4(.1f, .121f, .16f, 1); //Highlighted color NPC NAME
//   private vec4 BaseColor = new vec4(.00186f, .0023f, .101f, 1);
//   List<List<TextBlock>> Lines = new List<List<TextBlock>>();
// bool bSpecial = false;
// Guy NpcTalking = null;

//         public Dialog(w:MasterMap, SpriteFont f)
// {
//   World = w;
//   Font = f;
// }
//         public void Quit()
// {
//   Text = null;
// }
//         public bool IsEnabled()
// {
//   return Text != null && Text.Count > 0;
// }
//         public float MaxLineWidthPixels()
// {
//   float box_pad_LR = 0.1f;
//   return (World.Screen.Viewport.TilesWidth - 2) * Res.Tiles.TileWidthPixels * (1.0f - box_pad_LR * 2.0f);
// }
//         public void ShowDialog(List < string > text, Guy NPC = null)
// {
//   //Halt = halt;
//   Text = new List<string>(text);//We edit this , so make a new 
//   _fNextChar = _fTextSpeed;
//   _iChar = 0;
//   _iMessage = 0;
//   Lines = new List<List<TextBlock>>();
//   WaitForUser = false;
//   NpcTalking = NPC;

//   //Add npc name if present
//   if (Text.Count > 0 && NPC != null && String.IsNullOrEmpty(NPC.NpcName) == false) {
//     Text[0] = "^" + NPC.NpcName + ": " + Text[0];
//   }
// }
//         private vec2 GetTextBasePos()
// {
//   return World.Screen.Viewport.Pos + new vec2(
//     Res.Tiles.TileWidthPixels * 1.35f,
//     World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 1.7f
//   );
// }
//         public float GetTextVHeightPixels()
// {
//   float v_pad = 0.15f;
//   float v_height = Res.Tiles.TileHeightPixels - (Res.Tiles.TileHeightPixels * v_pad) * 2.0f;

//   return v_height;
// }
//         public float GetTextLineHeightPixels()
// {
//   float v_pad = 0.20f;
//   float v_height = Res.Tiles.TileHeightPixels - (Res.Tiles.TileHeightPixels * v_pad) * 2.0f;

//   return v_height;
// }
//         public void Update(float dt)
// {
//   if (IsEnabled()) {
//     if (TextCursor == null) {
//       TextCursor = new GameObject(World, Res.SprMoreTextCursor);
//       TextCursor.Animate = true;
//     }
//     TextCursor.Update(World.Screen.Game.Input, dt);

//     AdvanceText(dt);

//     //Move The blocks up if we have too much text.
//     if (Lines.Count >= 3) {
//       vec2 vp_off = GetTextBasePos();
//       for (int iLine = Lines.Count - 1; iLine >= 0; iLine--)
//       {
//         bool removeLine = false;
//         foreach(TextBlock block in Lines[iLine])
//         {
//           block.Pos.y -= 1.0f;

//           float miny = GetTextBasePos().y - GetTextLineHeightPixels();

//           float block_pos_abs = block.Pos.y + vp_off.y;

//           if (block_pos_abs < miny) {
//             removeLine = true;
//           }

//           //fade the text that falls off the top
//           if (block_pos_abs < GetTextBasePos().y + 0.1f)
//           {
//             block.Alpha = (block_pos_abs - miny) / (GetTextBasePos().y - miny) * 0.8f;
//           }
//         }

//         if (removeLine) {
//           Lines.RemoveAt(iLine);
//         }
//       }
//     }

//   }
// }
//         private void AdvanceText(float dt)
// {
//   //This advances the MESSAGE text.
//   if (WaitForUser == false) {
//     _fNextChar -= dt;
//     if (_fNextChar <= 0) {
//       if (World.GetPlayer().Joystick.Ok.PressOrDown()) {
//         _fNextChar = _fTextSpeedSkip;
//         this.World.GetPlayer().HasInteractedThisFrame = true;
//       }
//       else {
//         _fNextChar = _fTextSpeed;
//       }

//       if (_iChar >= Text[_iMessage].Length) {
//         _iChar = Text[_iMessage].Length - 1;
//         WaitForUser = true;
//       }
//       else {
//         if (Char.IsWhiteSpace(Text[_iMessage][_iChar]) == false) {
//           Res.Audio.PlaySound(Res.SfxTextBlip);
//         }

//         AddChar(Text[_iMessage][_iChar]);
//       }
//       _iChar++;
//     }
//   }

//   if (WaitForUser == true) {
//     if (Halt == false) {
//       Guy guy = World.GetPlayer();
//       if (guy.Joystick.Ok.Press() || guy.Joystick.Action.Press() || this.World.Rmb.PressOrDown() || this.World.Lmb.PressOrDown()) {
//         this.World.GetPlayer().HasInteractedThisFrame = true;

//         _iChar = 0;
//         _iMessage += 1;
//         WaitForUser = false;

//         StartNewLine(new vec2(0, GetNextLineY()));

//         if (_iMessage >= Text.Count) {
//           Text = null;//Hide the textbox

//           if (NpcTalking != null) {
//             NpcTalking.AIState = AIState.Wander;
//             NpcTalking.SetSprite(NpcTalking.WalkSprite);
//           }
//         }
//       }
//     }

//   }
// }
//         private void StartNewLine(vec2 xy)
// {
//   List < TextBlock > tbl = new List<TextBlock>();
//   Lines.Add(tbl);
//   StartNewBlock(xy, bSpecial ? SpecialColor : BaseColor);
// }
//         private void StartNewBlock(vec2 xy, vec4 color)
// {
//   if (Lines.Count == 0) {
//     //**ERROR
//     System.Diagnostics.Debugger.Break();
//     return;
//   }
//   Lines[Lines.Count - 1].Add(new TextBlock("", xy, color));
// }
//         private void AddChar(char c)
// {

//   //Compute Line Length
//   //we need to use pixels because # chars simply doesn't work.
//   float curLineWidthPixels = 0;
//   if (Lines.Count > 0) {
//     curLineWidthPixels = GetLineWidthPixels(Lines[Lines.Count - 1]);
//   }
//   else {
//     StartNewLine(new vec2(0, 0));
//   }

//   if (Lines.Count > 0 && Lines[Lines.Count - 1].Count > 0 && curLineWidthPixels >= MaxLineWidthPixels()) {
//     //Start a new line. also use a - if we need to wrap words
//     List < TextBlock > lastLine = Lines[Lines.Count - 1];
//     TextBlock lastBlock = lastLine[lastLine.Count - 1];

//     char c_last = lastBlock.Text[lastBlock.Text.Length - 1];
//     char c_next = _iChar < Text[_iMessage].Length ? Text[_iMessage][_iChar] : ' ';

//     if (Char.IsWhiteSpace(c_last) == false && Char.IsWhiteSpace(c_next) == false) {
//       lastBlock.Text = lastBlock.Text.Substring(0, lastBlock.Text.Length - 1) + '-';
//     }

//     StartNewLine(new vec2(0, GetNextLineY()));

//     if (Char.IsWhiteSpace(c_last) == false && Char.IsWhiteSpace(c_next) == false) {
//       //Move the hyphenated char to the next line
//       Lines[Lines.Count - 1][Lines[Lines.Count - 1].Count - 1].Text += c_last;
//     }

//   }

//   if (c == '*') {
//     bSpecial = true;
//     StartNewBlock(new vec2(GetCurLineX(), GetCurLineY()), SpecialColor);
//   }
//   else if (c == '^') {
//     bSpecial = true;
//     StartNewBlock(new vec2(GetCurLineX(), GetCurLineY()), SpecialColor2);
//   }
//   else {
//     if (Char.IsWhiteSpace(c) && bSpecial) {
//       bSpecial = false;
//       StartNewBlock(new vec2(GetCurLineX(), GetCurLineY()), BaseColor);
//     }

//     Lines[Lines.Count - 1][Lines[Lines.Count - 1].Count - 1].Text += c;
//   }

// }
//         public float GetLineWidthPixels(List < TextBlock > line)
// {
//   float w = 0;
//   foreach(TextBlock b in line)
//   {
//     if (String.IsNullOrEmpty(b.Text)) {
//       //We get NAN if text is empty for MeasureString...why.. 
//       continue;
//     }
//     Vector2 deviceWidth = Font.MeasureString(b.Text);

//     float scale = World.Screen.DrawText_Fit_H_OR_V_Scale(Font, false, b.Text, GetTextVHeightPixels());

//     deviceWidth *= scale;//This gives us the actual device pixels width.
//     vec2 wh_pixels = World.Screen.Viewport.ScreenRasterToScreenPixels(new vec2(deviceWidth));

//     w += wh_pixels.x;
//   }
//   return w;
// }
//         public float GetNextLineY()
// {
//   if (Lines.Count == 0) {
//     return 0;
//   }
//   if (Lines[Lines.Count - 1].Count == 0) {
//     return 0;
//   }
//   float lowest_y = Lines[Lines.Count - 1][Lines[Lines.Count - 1].Count - 1].Pos.y;
//   return lowest_y + GetTextLineHeightPixels();
// }
//         public float GetCurLineY()
// {
//   if (Lines.Count == 0) {
//     return 0;
//   }
//   if (Lines[Lines.Count - 1].Count == 0) {
//     return 0;
//   }
//   return Lines[Lines.Count - 1][Lines[Lines.Count - 1].Count - 1].Pos.y;
// }
//         public float GetCurLineX()
// {
//   if (Lines.Count == 0) {
//     return 0;
//   }
//   if (Lines[Lines.Count - 1].Count == 0) {
//     return 0;
//   }
//   return GetLineWidthPixels(Lines[Lines.Count - 1]);
// }
//         public void Draw(SpriteBatch sb)
// {
//   if (IsEnabled()) {
//     DrawDialogBackground(sb);

//     //Draw the cursor
//     if (WaitForUser && Halt == false) {
//       vec2 wh = new vec2(Res.Tiles.TileWidthPixels, Res.Tiles.TileHeightPixels);
//       World.Screen.DrawUIFrame(sb,
//         TextCursor.Frame,
//         new vec2(
//           World.Screen.Viewport.WidthPixels - (Res.Tiles.TileWidthPixels) * 2.0f,
//           World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 0.8f),
//         wh, new vec4(1, 1, 1, 1));
//     }

//     vec2 vp_off = GetTextBasePos();
//     //Draw the text
//     foreach(List < TextBlock > line in Lines)
//     {
//       foreach(TextBlock block in line)
//       {
//         World.Screen.DrawText_Fit_V(sb, Font, block.Text,
//           GetTextVHeightPixels(), vp_off + block.Pos, block.Color * block.Alpha, 2, new vec4(1, 1, 1, 1) * block.Alpha, "", false);
//       }
//     }



//   }
// }
//         public void DrawDialogBackground(SpriteBatch sb)
// {
//   Sprite spr = Res.Tiles.GetSprite(Res.SprTextBk);
//   vec2 wh = new vec2(
//     Res.Tiles.TileWidthPixels,
//     Res.Tiles.TileHeightPixels
//   );
//   World.Screen.DrawUIFrame(sb,
//     Res.SprTextBk, 0,
//     new vec2((Res.Tiles.TileWidthPixels) * (1), World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 2),
//     wh, new vec4(1, 1, 1, 1));
//   World.Screen.DrawUIFrame(sb,
//     Res.SprTextBk, 3,
//     new vec2((Res.Tiles.TileWidthPixels) * (1), World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 1),
//     wh, new vec4(1, 1, 1, 1));

//   for (int i = 2; i < World.Screen.Viewport.TilesWidth - 2; ++i)
//   { 
//     World.Screen.DrawUIFrame(sb,
//       Res.SprTextBk, 1,
//       new vec2(
//         (Res.Tiles.TileWidthPixels) * (i),
//         World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 2),
//       wh, new vec4(1, 1, 1, 1));
//     World.Screen.DrawUIFrame(sb,
//       Res.SprTextBk, 4,
//       new vec2(
//         (Res.Tiles.TileWidthPixels) * (i),
//         World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 1),
//       wh, new vec4(1, 1, 1, 1));
//   }

//   World.Screen.DrawUIFrame(sb,
//     Res.SprTextBk, 2,
//     new vec2(World.Screen.Viewport.WidthPixels - (Res.Tiles.TileWidthPixels) * 2,
//       World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 2),
//     wh, new vec4(1, 1, 1, 1));
//   World.Screen.DrawUIFrame(sb,
//     Res.SprTextBk, 5,
//     new vec2(World.Screen.Viewport.WidthPixels - (Res.Tiles.TileWidthPixels) * 2,
//       World.Screen.Viewport.HeightPixels - (Res.Tiles.TileHeightPixels) * 1),
//     wh, new vec4(1, 1, 1, 1));
// }

//     }