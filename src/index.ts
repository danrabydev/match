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

/**
 * Exhaustively match on a `{ tag }` discriminated union.
 *
 * @throws {Error} if `value.tag` has no corresponding arm
 */
export function match<T extends { tag: string }, R>(
  value: T,
  arms: MatchArms<T, R>,
): R {
  const arm = arms[value.tag as T["tag"]];
  if (arm === undefined) {
    throw new Error(`unhandled variant: ${String(value.tag)}`);
  }
  return (arm as (payload: T) => R)(value);
}

type VariantCtor = (...args: never[]) => object;

/**
 * Build a tagged-union namespace from payload constructors.
 *
 * Each key becomes a constructor that returns `{ tag: key, ...payload }`.
 * The returned object also has `match` (exhaustive) and `_tags` (enumerable
 * variant names), which is useful for serialization, codegen, and UI.
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
  defs: Defs,
) {
  type Variants = {
    [K in keyof Defs]: ReturnType<Defs[K]> & { tag: K & string };
  };
  type Union = Variants[keyof Variants];

  const constructors = {} as {
    [K in keyof Defs]: (
      ...args: Parameters<Defs[K]>
    ) => ReturnType<Defs[K]> & { tag: K & string };
  };

  for (const key of Object.keys(defs) as (keyof Defs)[]) {
    const ctor = defs[key];
    if (ctor === undefined) continue;
    constructors[key] = ((...args: never[]) => ({
      tag: key,
      ...ctor(...args),
    })) as any;
  }

  return {
    ...constructors,
    match: <R>(value: Union, arms: MatchArms<Union, R>): R =>
      match(value, arms),
    _tags: Object.keys(defs) as (keyof Defs & string)[],
  };
}

/**
 * Extract the tagged-union type from a `createMatchable` namespace.
 *
 * @example
 * ```ts
 * const Status = createMatchable({ Ok: () => ({}), Err: (e: Error) => ({ e }) });
 * type Status = MatchableOf<typeof Status>;
 * ```
 */
export type MatchableOf<T> = T extends { match: (value: infer V, arms: never) => unknown }
  ? V
  : never;
