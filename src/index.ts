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

const RESERVED_VARIANT_NAMES = new Set([
  "match",
  "_tags",
  "__proto__",
  "prototype",
  "constructor",
]);

/**
 * Exhaustively match on a `{ tag }` discriminated union.
 *
 * Only own, callable arms are used — inherited `Object.prototype`
 * properties cannot satisfy a missing arm.
 *
 * @throws {Error} if `value.tag` has no corresponding own arm
 */
export function match<T extends { tag: string }, R>(
  value: T,
  arms: MatchArms<T, R>,
): R {
  const tag = value.tag;
  if (!Object.hasOwn(arms, tag)) {
    throw new Error(`unhandled variant: ${String(tag)}`);
  }
  const arm = arms[tag as T["tag"]];
  if (typeof arm !== "function") {
    throw new Error(`unhandled variant: ${String(tag)}`);
  }
  return (arm as (payload: T) => R)(value);
}

type VariantCtor = (...args: never[]) => object;

function bindVariantCtor<K extends string, F extends VariantCtor>(
  key: K,
  ctor: F,
): (...args: Parameters<F>) => ReturnType<F> & { tag: K } {
  return (...args: Parameters<F>) => {
    const payload = { ...ctor(...(args as never[])) };
    Object.defineProperty(payload, "tag", {
      value: key,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    return payload as ReturnType<F> & { tag: K };
  };
}

type ReservedVariantName =
  | "match"
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

declare const matchableUnion: unique symbol;

/**
 * Phantom brand carrying the tagged-union type of a `createMatchable`
 * namespace. Stable under `match` signature changes; used by `MatchableOf`.
 */
type MatchableBrand<U> = {
  readonly [matchableUnion]: [U];
};

/**
 * Build a tagged-union namespace from payload constructors.
 *
 * Each key becomes a constructor that returns `{ ...payload, tag: key }`.
 * The library-assigned `tag` is written last so payload fields cannot
 * forge the discriminant, then locked (`writable: false`,
 * `configurable: false`) so later assignment cannot reroute `match`.
 * The returned object also has `match` (exhaustive) and `_tags`
 * (enumerable variant names).
 *
 * Variant names `match`, `_tags`, `__proto__`, `prototype`, and
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
    [K in keyof Defs]: (
      ...args: Parameters<Defs[K]>
    ) => ReturnType<Defs[K]> & { tag: K & string };
  };

  for (const key of Object.keys(defs) as (keyof Defs)[]) {
    if (RESERVED_VARIANT_NAMES.has(key as string)) {
      throw new Error(`reserved variant name: ${String(key)}`);
    }
    const ctor = defs[key];
    if (ctor === undefined) continue;
    Object.defineProperty(constructors, key, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: bindVariantCtor(key as keyof Defs & string, ctor),
    });
  }

  const namespace = {
    ...constructors,
    match: <R>(value: Union, arms: MatchArms<Union, R>): R =>
      match(value, arms),
    _tags: Object.keys(defs) as (keyof Defs & string)[],
  };
  return namespace as typeof namespace & MatchableBrand<Union>;
}

/**
 * Extract the tagged-union type from a `createMatchable` namespace.
 *
 * Infers from a phantom brand on the namespace, not from `match`'s
 * parameter list, so adding arguments to `match` cannot break this.
 *
 * @example
 * ```ts
 * const Status = createMatchable({ Ok: () => ({}), Err: (e: Error) => ({ e }) });
 * type Status = MatchableOf<typeof Status>;
 * ```
 */
export type MatchableOf<T> = T extends {
  readonly [matchableUnion]: [infer U];
}
  ? U
  : never;
