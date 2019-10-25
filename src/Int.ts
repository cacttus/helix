
//https://spin.atomicobject.com/2018/11/05/using-an-int-type-in-typescript/
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
