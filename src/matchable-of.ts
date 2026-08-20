import type { Prettify } from "./internal/types.js";

declare const matchableUnion: unique symbol;

/**
 * Phantom brand carrying the tagged-union type of a `createMatchable`
 * namespace. Used by `MatchableOf`.
 */
export type MatchableBrand<U> = {
  readonly [matchableUnion]: [U];
};

export type UnionOf<T> = T extends {
  readonly [matchableUnion]: [infer U];
}
  ? U
  : never;

/** Payload of every variant that has a `data` field; `never` if none do. */
export type DataOf<U> = U extends { data: infer D } ? D : never;

/** Payload of every variant that has an `err` field; `never` if none do. */
export type ErrOf<U> = U extends { err: infer E } ? E : never;

type ReplaceFieldOne<U, K extends PropertyKey, V> = [K] extends [keyof U]
  ? Prettify<{ [P in keyof U]: P extends K ? V : U[P] }>
  : Prettify<U>;

/** Distribute first so a generic `Data`/`Err` cannot collapse the union. */
type Specialize<U, Data, Err> = U extends unknown
  ? ReplaceFieldOne<ReplaceFieldOne<U, "data", Data>, "err", Err>
  : never;

/**
 * Extract the tagged-union type from a `createMatchable` namespace.
 *
 * Extra type arguments specialize payload holes, in order: `data`, then
 * `err`. Each argument must extend the constructor payload; a hole no
 * variant has is `never`. Alias once to use `X<TData>` at call sites:
 * `type X<TData> = MatchableOf<typeof X, TData>`.
 *
 * @example
 * ```ts
 * const ApiResult = createMatchable({
 *   Success: (data: unknown) => ({ data }),
 *   Error: (err: unknown) => ({ err }),
 * });
 * type ApiResult<T, E = unknown> = MatchableOf<typeof ApiResult, T, E>;
 * ```
 */
export type MatchableOf<
  T,
  Data extends DataOf<UnionOf<T>> = DataOf<UnionOf<T>>,
  Err extends ErrOf<UnionOf<T>> = ErrOf<UnionOf<T>>,
> = Specialize<UnionOf<T>, Data, Err>;
