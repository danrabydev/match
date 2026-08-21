import { emitPeek } from "./diagnostics.js";

export const peekerName: unique symbol = Symbol("match.peeker");

/**
 * Name a reusable peek arm map so diagnostics can label the trail.
 * The name is non-enumerable and is not a variant key.
 */
export function peeker<A extends object>(
  name: string,
  arms: A,
): A & { readonly [peekerName]: string } {
  Object.defineProperty(arms, peekerName, {
    value: name,
    enumerable: false,
    configurable: true,
    writable: false,
  });
  return arms as A & { readonly [peekerName]: string };
}

function peekerLabel(arms: object): string {
  if (Object.hasOwn(arms, peekerName) || peekerName in arms) {
    const label = (arms as { [peekerName]?: string })[peekerName];
    if (typeof label === "string") return label;
  }
  return "anonymous";
}

/**
 * Optional observer map: any subset of tags, including none.
 * Omitted tags are no-ops. Arms return `void` (incidental returns ignored).
 */
export type PeekArms<T extends { tag: string }> = {
  [K in T["tag"]]?: (value: Readonly<Extract<T, { tag: K }>>) => void;
};

export type ExtraPeekArms<
  Union extends { tag: string },
  V extends { tag: string },
> = {
  [K in Exclude<Union["tag"], V["tag"]>]?: (
    value: Readonly<Extract<Union, { tag: K }>>,
  ) => void;
};

export type BoundPeek<Union extends { tag: string }> = <V>(
  value: V,
  arms: [V] extends [{ tag: Union["tag"] }]
    ? PeekArms<V> & ExtraPeekArms<Union, V>
    : PeekArms<Union>,
) => V;

/**
 * Optionally observe a tagged value, then return it unchanged (`===`).
 *
 * Only own, callable arms run — inherited `Object.prototype` properties
 * cannot fire. Missing arms are no-ops. The arm’s return is discarded.
 *
 * @throws {Error} if `value` has no `tag`
 */
export function peek<T>(
  value: T,
  arms: [T] extends [{ tag: string }] ? PeekArms<T> : never,
): T {
  const tagged = value as T & { tag: string };
  const tag = tagged.tag;
  if (tag === undefined) {
    throw new Error("peek value is missing tag");
  }
  let hit = false;
  if (Object.hasOwn(arms, tag)) {
    const arm = (arms as Record<string, unknown>)[tag];
    if (typeof arm === "function") {
      hit = true;
      (arm as (payload: T) => void)(value);
    }
  }
  emitPeek(tagged, peekerLabel(arms), hit);
  return value;
}
