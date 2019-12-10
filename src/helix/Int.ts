
/**
 * @file Int.ts
 * @author Derek Page
 * @see https://spin.atomicobject.com/2018/11/05/using-an-int-type-in-typescript/
 * @package Helix VR Typescript Game Library
 * @date 12/8/2019
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
//Waiting for Bigint..2020, 2021, 2022..

export type Int = number & { __int__: void };
export const roundToInt = (num: number): Int => Math.round(num) as Int;

//** This toInt is in anticipation of BigInt, so we should be able to regex replace all toInt(X) with Xn
export const toInt = (value: number): Int => {
  return (value | 0) as Int;//Math.floor(value) as Int;
};
export const cmpInts = (a:any, b:any) : boolean => {
  return a as Int === b as Int;
}
export const checkIsInt = (num: number): num is Int =>  num % 1 === 0;
export const assertAsInt = (num: number): Int => {
  try {
    if (checkIsInt(num)) {
      return num;
    }
  } catch (err) {
    throw new Error(`Invalid Int value (error): ${num}`);
  }

  throw new Error(`Invalid Int value: ${num}`);
};
