import {
  type IsUnknown,
  type Prettify,
  type SameType,
  type VariantCtor,
} from "./types.js";

type ReplaceMatching<R, From, To> = {
  [P in keyof R]: P extends "data" | "err"
    ? SameType<R[P], From> extends true
      ? To
      : R[P]
    : R[P];
};

type TaggedCtorFromArgs<K extends string, A extends unknown[], R> = A extends []
  ? () => Prettify<R & { tag: K }>
  : A extends [infer _Arg, infer _Next, ...infer _Rest]
    ? (...args: A) => Prettify<R & { tag: K }>
    : A extends [infer Arg]
      ? IsUnknown<Arg> extends true
        ? <T>(arg: T) => Prettify<ReplaceMatching<R, unknown, T> & { tag: K }>
        : (arg: Arg) => Prettify<R & { tag: K }>
      : (...args: A) => Prettify<R & { tag: K }>;

export type TaggedCtor<K extends string, F> = F extends (
  ...args: infer A
) => infer R
  ? TaggedCtorFromArgs<K, A, R>
  : F;

/** Lock `tag` last so payload fields cannot forge the discriminant. */
export function lockTag<K extends string, P extends object>(
  payload: P,
  tag: K,
): P & { tag: K } {
  const out = { ...payload } as P & { tag: K };
  Object.defineProperty(out, "tag", {
    value: tag,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return out;
}

export function bindVariantCtor<K extends string, F extends VariantCtor>(
  key: K,
  ctor: F,
): TaggedCtor<K, F> {
  return ((...args: Parameters<F>) => {
    const payload = { ...ctor(...(args as never[])) };
    return lockTag(payload, key);
  }) as unknown as TaggedCtor<K, F>;
}
