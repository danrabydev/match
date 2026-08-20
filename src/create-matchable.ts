import { bindVariantCtor, type TaggedCtor } from "./internal/tagged-ctor.js";
import type { VariantCtor } from "./internal/types.js";
import type { BoundMatch } from "./match.js";
import { match, type MatchArms } from "./match.js";
import { merge, type BoundMerge } from "./merge.js";
import type { MatchableBrand } from "./matchable-of.js";

const RESERVED_VARIANT_NAMES = new Set([
  "match",
  "merge",
  "_tags",
  "__proto__",
  "prototype",
  "constructor",
]);

type ReservedVariantName =
  | "match"
  | "merge"
  | "_tags"
  | "__proto__"
  | "prototype"
  | "constructor";

type KnownReservedVariantKeys<D> = string extends keyof D
  ? never
  : Extract<keyof D, ReservedVariantName>;

type ForbidReservedVariantKeys<D> = [KnownReservedVariantKeys<D>] extends [
  never,
]
  ? D
  : never;

/**
 * Build a tagged-union namespace from payload constructors.
 *
 * Each key becomes a constructor that returns `{ ...payload, tag: key }`.
 * Only enumerable own fields are copied — return a plain object, not a
 * class instance (methods and the prototype are dropped).
 * The library-assigned `tag` is written last so payload fields cannot
 * forge the discriminant, then locked (`writable: false`,
 * `configurable: false`) so later assignment cannot reroute `match`.
 * A one-argument constructor whose parameter is `unknown` infers `data`
 * / `err` from the value (`Success(post)` is `{ data: Post }`).
 * The returned object also has `match` (exhaustive) and `_tags`
 * (installed constructors, definition order). `merge` is present when
 * there is an `Error` variant whose payload includes `err`.
 *
 * Variant names `match`, `merge`, `_tags`, `__proto__`, `prototype`, and
 * `constructor` are reserved: they are a type error and throw at
 * creation time.
 *
 * @example
 * ```ts
 * const Status = createMatchable({
 *   Idle: () => ({}),
 *   Loading: (msg: string) => ({ msg }),
 *   Success: (data: number) => ({ data }),
 *   Error: (err: Error) => ({ err }),
 * });
 *
 * type Status = MatchableOf<typeof Status>;
 *
 * const result = Status.match(Status.Loading("fetching"), {
 *   Idle: () => "waiting",
 *   Loading: ({ msg }) => `state: ${msg}`,
 *   Success: ({ data }) => `got ${data}`,
 *   Error: ({ err }) => err.message,
 * });
 * ```
 */
export function createMatchable<const Defs extends Record<string, VariantCtor>>(
  defs: ForbidReservedVariantKeys<Defs>,
) {
  type Variants = {
    [K in keyof Defs]: ReturnType<Defs[K]> & { tag: K & string };
  };
  type Union = Variants[keyof Variants];

  const constructors = Object.create(null) as {
    [K in keyof Defs]: TaggedCtor<K & string, Defs[K]>;
  };
  const tags: (keyof Defs & string)[] = [];

  for (const key of Object.keys(defs) as (keyof Defs)[]) {
    if (RESERVED_VARIANT_NAMES.has(key as string)) {
      throw new Error(`reserved variant name: ${String(key)}`);
    }
    const ctor = defs[key];
    if (ctor === undefined) continue;
    const name = key as keyof Defs & string;
    tags.push(name);
    Object.defineProperty(constructors, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: bindVariantCtor(name, ctor),
    });
  }

  const base = {
    ...constructors,
    match: ((value, arms) =>
      match(
        value as { tag: string },
        arms as MatchArms<{ tag: string }, unknown>,
      )) as BoundMatch<Union>,
    _tags: tags,
  };
  type CanMerge = "Error" extends keyof Defs
    ? ReturnType<Extract<Defs["Error"], VariantCtor>> extends {
        err: unknown;
      }
      ? true
      : false
    : false;

  const mergeFn = ((
    a: { tag: string },
    b: { tag: string },
    ...rest: { tag: string }[]
  ) =>
    merge(base as never, a as never, b as never, ...(rest as never[]))) as BoundMerge<
    typeof base & MatchableBrand<Union>
  >;

  const namespace = {
    ...base,
    ...(typeof (constructors as { Error?: unknown }).Error === "function"
      ? { merge: mergeFn }
      : {}),
  };
  return namespace as typeof base &
    MatchableBrand<Union> &
    (CanMerge extends true ? { merge: typeof mergeFn } : {});
}
