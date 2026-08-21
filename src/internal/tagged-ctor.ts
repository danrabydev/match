import {
  attachDiag,
  isDiagnostics,
  type BrandedDiag,
} from "../diagnostics.js";
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

type DiagParam = BrandedDiag;

type TaggedCtorFromArgs<K extends string, A extends unknown[], R> = A extends []
  ? (diag?: DiagParam) => Prettify<R & { tag: K }>
  : A extends [infer _Arg, infer _Next, ...infer _Rest]
    ? (...args: [...A, diag?: DiagParam]) => Prettify<R & { tag: K }>
    : A extends [infer Arg]
      ? IsUnknown<Arg> extends true
        ? <T>(
            arg: T,
            diag?: DiagParam,
          ) => Prettify<ReplaceMatching<R, unknown, T> & { tag: K }>
        : (arg: Arg, diag?: DiagParam) => Prettify<R & { tag: K }>
      : (...args: [...A, diag?: DiagParam]) => Prettify<R & { tag: K }>;

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
  return ((...args: unknown[]) => {
    let mask: BrandedDiag | undefined;
    if (args.length > 0 && isDiagnostics(args[args.length - 1])) {
      mask = args.pop() as BrandedDiag;
    }
    const payload = { ...ctor(...(args as never[])) };
    const value = lockTag(payload, key);
    if (mask !== undefined) {
      attachDiag(value, {
        enabled: mask.enabled,
        ...(mask.branches === undefined ? {} : { branches: mask.branches }),
      });
    }
    return value;
  }) as unknown as TaggedCtor<K, F>;
}
