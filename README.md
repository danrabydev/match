# @danrabydev/match

Rust-style tagged unions and exhaustive `match` for TypeScript.

Zero dependencies. Constructors for every variant, compile-time exhaustiveness, and enumerable tags at runtime.

Building this repo requires **Node 22.18+** so tsdown can load `tsdown.config.ts` with native TypeScript stripping. `unrun` is not a direct dependency (tsdown may still list it as an optional peer in the lockfile). The published `dist/` is ES2022 and does not require that Node version.

## Installation

```bash
pnpm add @danrabydev/match
```

## Quick start

```ts
import { createMatchable, type MatchableOf } from "@danrabydev/match";

const Status = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: number) => ({ data }),
  Error: (err: Error) => ({ err }),
});

type Status = MatchableOf<typeof Status>;

const result = Status.match(Status.Loading("fetching"), {
  Idle: () => "waiting",
  Loading: ({ msg }) => `state: ${msg}`,
  Success: ({ data }) => `got ${data}`,
  Error: ({ err }) => err.message,
});
// => "state: fetching"
```

Omit an arm and TypeScript reports an error. Handle a value whose `tag` has no arm at runtime and `match` throws.

Reuse one matchable with different `data` (and optionally `err`) by aliasing a generic:

```ts
const ApiResult = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: unknown) => ({ data }),
  Error: (err: unknown) => ({ err }),
});

type ApiResult<TData, TErr = unknown> = MatchableOf<typeof ApiResult, TData, TErr>;

function handle<TData>(result: ApiResult<TData>): TData | undefined {
  return ApiResult.match(result, {
    Idle: () => undefined,
    Loading: () => undefined,
    Success: ({ data }) => data,
    Error: () => undefined,
  });
}
```

Call sites are `ApiResult<User>` and `ApiResult<Post>` — one runtime namespace. A one-argument constructor whose parameter is `unknown` infers `data` / `err` from the value (`ApiResult.Success(post)` is `{ tag: "Success"; data: Post }`), so a function returning `ApiResult<Post, ApiError>` does not need a cast. Extra type arguments must extend the constructor payload (`MatchableOf<typeof Status, string>` is an error when `data` is `number`). A hole no variant has is `never`, so a surplus argument is an error.

Every feature, including a small API-client app, lives in [`examples/`](./examples/).

## API

### `createMatchable(defs)`

Takes a map of variant name → payload constructor. Returns:

- **constructors** for each key (`Status.Loading("fetching")` → `{ tag: "Loading", msg: "fetching" }`)
- **`match(value, arms)`** — exhaustive matcher bound to this union
- **`merge(...results)`** — zip same-tag results; mixed tags become `Error` (`TagMismatch`)
- **`_tags`** — `string[]` of installed variant names, in definition order (`undefined` constructor holes are omitted)

`tag` is always the constructor name, even if the payload also has a `tag` field. It is non-writable and non-configurable so later assignment cannot reroute `match`. Names `match`, `merge`, `_tags`, `__proto__`, `prototype`, and `constructor` are reserved (type error and runtime throw). `__proto__` is rejected at runtime even when written via `Object.create(null)`.

Constructors should return **plain objects**. The library copies **enumerable own fields** only (`{ ...payload, tag }`). Class instances lose methods and the prototype; that is expected. Return `{ value }` (or another plain record), not `new SomeClass()`.

### `match(value, arms)`

Standalone exhaustive matcher for any `{ tag: string }` union. Same runtime behavior as the bound `match` on a matchable namespace. The value’s type is inferred from the first argument, so `match(result: ApiResult<User>, …)` types `data` as `User`. Bound `Ns.match` allows extra arms for tags not present on a narrowed value; standalone `match` does not. A variable typed as the full union still requires every arm.

Only own, callable arms are considered — a missing arm is never taken from `Object.prototype`.

### `MatchableOf<T, Data?, Err?>`

Extracts the tagged-union type from a `createMatchable` result so you can write `type Status = MatchableOf<typeof Status>`.

Optional type arguments specialize payload holes, in order: `Data` replaces `data`, `Err` replaces `err`. To use `X<TData>` at call sites, alias once:

```ts
type ApiResult<TData, TErr = unknown> = MatchableOf<typeof ApiResult, TData, TErr>;
```

### `merge(ns, ...results)` / `Ns.merge(...results)`

Zip two or more values from the **same** matchable. Every `tag` must match. Matching `Success` values become `Success` with `data: [d1, d2, …]`; matching `Error` values zip `err` the same way; other payload fields (`msg`, `at`, …) become tuples. Mixed tags call `Error` with `{ reason: "tag-mismatch", tags }` (`TagMismatch`) — not a domain error.

`merge` is only on namespaces whose `Error` constructor returns `{ err }`. Missing `Error` throws. `tag` is locked on the result.

```ts
const page = ApiResult.merge(getUser(uid), getPost(pid));
ApiResult.match(page, {
  Success: ({ data: [user, post] }) => `${user.name}: ${post.title}`,
  Error: ({ err }) => /* TagMismatch | [ApiError, ApiError] */,
  Idle: () => "idle",
  Loading: ({ msg }) => msg.join(", "),
});
```

### `MatchArms<T, R>`

The arm map type used by `match`: one function per `T["tag"]`, each receiving that variant’s payload.

## Why this pattern

| Need | What you get |
| --- | --- |
| Compile-time exhaustiveness | Adding a variant without updating `match` is a type error |
| Runtime constructors | `Status.Success(1)` instead of hand-written `{ tag: "Success", data: 1 }` |
| Enumerable keys | `_tags` lists variants for logs, serializers, and UI without a separate enum |

This is the TypeScript analogue of a Rust `enum` plus `match`: a closed set of tagged values, constructed in one place, destructured exhaustively everywhere else.

## Publishing

`pnpm check` typechecks, tests, builds, smoke-tests `dist/`, then runs [publint](https://publint.dev/) and [Are The Types Wrong](https://arethetypeswrong.github.io/). Publish with provenance:

```bash
pnpm publish:npm
```

(`npm publish --access public --provenance`. Requires a trusted publisher / OIDC environment such as GitHub Actions.)

## License

MIT
