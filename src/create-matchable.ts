import {
  attachDiag,
  diagnostics,
  getDiag,
  isDiagnostics,
  type DiagOptions,
  type DiagReporters,
  type DiagSlot,
} from "./diagnostics.js";
import { bindVariantCtor, type TaggedCtor } from "./internal/tagged-ctor.js";
import type { VariantCtor } from "./internal/types.js";
import type { BoundMatch } from "./match.js";
import { match, type MatchArms } from "./match.js";
import { merge, type BoundMerge } from "./merge.js";
import type { MatchableBrand } from "./matchable-of.js";
import { peek, type BoundPeek, type PeekArms } from "./peek.js";

const RESERVED_VARIANT_NAMES = new Set([
  "match",
  "merge",
  "peek",
  "withDiagnostics",
  "_tags",
  "__proto__",
  "prototype",
  "constructor",
]);

type ReservedVariantName =
  | "match"
  | "merge"
  | "peek"
  | "withDiagnostics"
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
 * The returned object also has `match` (exhaustive), `peek` (optional
 * void observers), `withDiagnostics` (bind a diag mask at init), and
 * `_tags` (installed constructors, definition order). `merge` is present
 * when there is an `Error` variant whose payload includes `err`.
 *
 * Variant names `match`, `merge`, `peek`, `withDiagnostics`, `_tags`,
 * `__proto__`, `prototype`, and `constructor` are reserved: they are a
 * type error and throw at creation time.
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

  const peekFn = ((value, arms) =>
    peek(
      value as { tag: string },
      arms as PeekArms<{ tag: string }>,
    )) as BoundPeek<Union>;

  const matchFn = ((value, arms) =>
    match(
      value as { tag: string },
      arms as MatchArms<{ tag: string }, unknown>,
    )) as BoundMatch<Union>;

  type CanMerge = "Error" extends keyof Defs
    ? ReturnType<Extract<Defs["Error"], VariantCtor>> extends {
        err: unknown;
      }
      ? true
      : false
    : false;

  const mergeHost = {
    ...constructors,
    match: matchFn,
    peek: peekFn,
    _tags: tags,
  };

  const mergeFn = ((
    a: { tag: string },
    b: { tag: string },
    ...rest: { tag: string }[]
  ) =>
    merge(
      mergeHost as never,
      a as never,
      b as never,
      ...(rest as never[]),
    )) as BoundMerge<typeof mergeHost & MatchableBrand<Union>>;

  const hasMerge =
    typeof (constructors as { Error?: unknown }).Error === "function";

  type BoundNs = typeof mergeHost &
    MatchableBrand<Union> & {
      withDiagnostics: (
        opts: DiagOptions<Union["tag"]> & DiagReporters,
      ) => BoundNs;
    } & (CanMerge extends true ? { merge: typeof mergeFn } : {});

  const withDiagnosticsFn = ((opts: DiagOptions & DiagReporters): BoundNs => {
    const wrapped = wrapConstructors(constructors, opts);
    return {
      ...wrapped,
      match: matchFn,
      peek: peekFn,
      withDiagnostics: withDiagnosticsFn,
      _tags: tags,
      ...(hasMerge ? { merge: mergeFn } : {}),
    } as unknown as BoundNs;
  }) as BoundNs["withDiagnostics"];

  const namespace = {
    ...constructors,
    match: matchFn,
    peek: peekFn,
    withDiagnostics: withDiagnosticsFn,
    _tags: tags,
    ...(hasMerge ? { merge: mergeFn } : {}),
  };
  return namespace as unknown as BoundNs;
}

function wrapConstructors<C extends Record<string, unknown>>(
  constructors: C,
  opts: DiagOptions & DiagReporters,
): C {
  const wrapped = Object.create(null) as C;
  for (const key of Object.keys(constructors) as (keyof C)[]) {
    const orig = constructors[key];
    if (typeof orig !== "function") continue;
    const bound = orig as (...args: unknown[]) => object;
    Object.defineProperty(wrapped, key, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: (...args: unknown[]) => {
        const passed = args.length > 0 && isDiagnostics(args[args.length - 1]);
        const callArgs =
          passed || !opts.enabled
            ? args
            : [
                ...args,
                diagnostics({
                  enabled: true,
                  ...(opts.branches === undefined
                    ? {}
                    : { branches: opts.branches }),
                }),
              ];
        const value = bound(...callArgs);
        const existing = getDiag(value);
        const slot: DiagSlot = {
          enabled: existing?.enabled ?? opts.enabled,
        };
        if (passed) {
          if (existing?.branches !== undefined) {
            slot.branches = existing.branches;
          }
        } else if (opts.branches !== undefined) {
          slot.branches = opts.branches;
        }
        if (opts.onPeek !== undefined) slot.onPeek = opts.onPeek;
        if (opts.onMatch !== undefined) slot.onMatch = opts.onMatch;
        attachDiag(value, slot);
        return value;
      },
    });
  }
  return wrapped;
}
