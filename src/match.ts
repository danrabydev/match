import { emitMatch } from "./diagnostics.js";

/**
 * Exhaustive handler map for a tagged union `T`, producing `R`.
 *
 * Every variant tag on `T` must have a corresponding arm. TypeScript
 * enforces this at compile time; `match` throws at runtime if a tag is
 * missing (for values constructed outside `createMatchable`).
 */
export type MatchArms<T extends { tag: string }, R> = {
  [K in T["tag"]]: (value: Extract<T, { tag: K }>) => R;
};

export type ExtraMatchArms<
  Union extends { tag: string },
  V extends { tag: string },
  R,
> = {
  [K in Exclude<Union["tag"], V["tag"]>]?: (
    value: Extract<Union, { tag: K }>,
  ) => R;
};

export type BoundMatch<Union extends { tag: string }> = <V, R>(
  value: V,
  arms: [V] extends [{ tag: Union["tag"] }]
    ? MatchArms<V, R> & ExtraMatchArms<Union, V, R>
    : MatchArms<Union, R>,
) => R;

/**
 * Exhaustively match on a `{ tag }` discriminated union.
 *
 * Only own, callable arms are used — inherited `Object.prototype`
 * properties cannot satisfy a missing arm.
 *
 * @throws {Error} if `value.tag` has no corresponding own arm
 */
export function match<T, R>(
  value: T,
  arms: [T] extends [{ tag: string }] ? MatchArms<T, R> : never,
): R {
  const tagged = value as T & { tag: string };
  const tag = tagged.tag;
  if (!Object.hasOwn(arms, tag)) {
    throw new Error(`unhandled variant: ${String(tag)}`);
  }
  const arm = (arms as Record<string, unknown>)[tag];
  if (typeof arm !== "function") {
    throw new Error(`unhandled variant: ${String(tag)}`);
  }
  const result = (arm as (payload: T) => R)(value);
  emitMatch(tagged);
  return result;
}
