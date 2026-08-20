import { lockTag } from "./internal/tagged-ctor.js";
import type { Prettify } from "./internal/types.js";
import type { UnionOf } from "./matchable-of.js";

/**
 * `err` payload when `merge` sees mixed tags.
 *
 * Distinct from domain errors so a matched `Error([e1, e2])` is not
 * confused with "the calls were not in the same state."
 */
export type TagMismatch = {
  reason: "tag-mismatch";
  tags: string[];
};

type PayloadKeys<V> = Exclude<keyof V, "tag">;

type ZipField<
  Rs extends unknown[],
  Tag extends string,
  P extends PropertyKey,
> = {
  [I in keyof Rs]: P extends keyof Extract<Rs[I] & object, { tag: Tag }>
    ? Extract<Rs[I] & object, { tag: Tag }>[P]
    : never;
};

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

/** Literal tag shared by every input, or `never` if tags may differ. */
type KnownEqualTag<Rs extends { tag: string }[]> = IsUnion<
  Rs[number]["tag"]
> extends true
  ? never
  : string extends Rs[number]["tag"]
    ? never
    : Rs[number]["tag"];

type MergedVariant<
  V,
  Rs extends { tag: string }[],
  IncludeMismatch extends boolean,
> = [V] extends [{ tag: infer K extends string }]
  ? Prettify<
      { tag: K } & {
        [P in PayloadKeys<V>]: K extends "Error"
          ? P extends "err"
            ? IncludeMismatch extends true
              ? TagMismatch | ZipField<Rs, K, P>
              : ZipField<Rs, K, P>
            : ZipField<Rs, K, P>
          : ZipField<Rs, K, P>;
      }
    >
  : never;

type MergedAll<Ns, Rs extends { tag: string }[]> =
  UnionOf<Ns> extends infer U
    ? U extends unknown
      ? MergedVariant<U, Rs, true>
      : never
    : never;

export type MergedOf<Ns, Rs extends { tag: string }[]> =
  KnownEqualTag<Rs> extends infer K
    ? [K] extends [never]
      ? MergedAll<Ns, Rs>
      : K extends string
        ? MergedVariant<Extract<UnionOf<Ns>, { tag: K }>, Rs, false>
        : MergedAll<Ns, Rs>
    : MergedAll<Ns, Rs>;

/** Namespace that can `merge`: an `Error` constructor that stores `err`. */
export type MergeNamespace = {
  Error: (err: never) => { tag: "Error"; err: unknown };
};

type ValueOf<Ns> = UnionOf<Ns> extends { tag: string }
  ? UnionOf<Ns>
  : { tag: string };

export type BoundMerge<Ns> = <
  const A extends ValueOf<Ns>,
  const B extends ValueOf<Ns>,
  const Rest extends ValueOf<Ns>[],
>(
  a: A,
  b: B,
  ...rest: Rest
) => MergedOf<Ns, [A, B, ...Rest]>;

function hasErrorCtor(
  ns: object,
): ns is MergeNamespace {
  return typeof (ns as { Error?: unknown }).Error === "function";
}

/**
 * Zip results from one matchable. Every value must share the same `tag`.
 *
 * Matching `Success` values zip `data` into a tuple; matching `Error`
 * values zip `err`. Other payload fields (`msg`, `at`, …) zip the same way.
 * Mixed tags call `ns.Error` with `{ reason: "tag-mismatch", tags }`
 * (`TagMismatch`) — not a domain error. `Error` must return `{ err }`.
 *
 * @throws {Error} if `ns` has no `Error` constructor, or a value has no `tag`
 */
export function merge<
  Ns extends MergeNamespace,
  const A extends ValueOf<Ns>,
  const B extends ValueOf<Ns>,
  const Rest extends ValueOf<Ns>[],
>(
  ns: Ns,
  a: A,
  b: B,
  ...rest: Rest
): MergedOf<Ns, [A, B, ...Rest]> {
  if (!hasErrorCtor(ns)) {
    throw new Error("merge requires an Error variant");
  }

  const results: { tag: string; [key: string]: unknown }[] = [
    a,
    b,
    ...rest,
  ] as { tag: string; [key: string]: unknown }[];
  const tags = results.map((r) => r.tag);
  const tag = tags[0];
  if (tag === undefined) {
    throw new Error("merge value is missing tag");
  }
  if (tags.some((t) => t !== tag)) {
    return ns.Error({
      reason: "tag-mismatch",
      tags,
    } as never) as MergedOf<Ns, [A, B, ...Rest]>;
  }

  const keys = new Set<string>();
  for (const r of results) {
    for (const key of Object.keys(r)) {
      if (key !== "tag") keys.add(key);
    }
  }
  const payload: Record<string, unknown> = {};
  for (const key of keys) {
    payload[key] = results.map((r) => r[key]);
  }
  return lockTag(payload, tag) as MergedOf<Ns, [A, B, ...Rest]>;
}
