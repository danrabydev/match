export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type VariantCtor = (...args: never[]) => object;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsUnknown<T> = IsAny<T> extends true
  ? false
  : unknown extends T
    ? true
    : false;

export type SameType<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? IsAny<A> extends IsAny<B>
      ? true
      : false
    : false
  : false;
