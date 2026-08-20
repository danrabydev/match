# @danrabydev/match

Rust-style tagged unions and exhaustive `match` for TypeScript.

Zero dependencies. Constructors for every variant, compile-time exhaustiveness, and enumerable tags at runtime.

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

## API

### `createMatchable(defs)`

Takes a map of variant name → payload constructor. Returns:

- **constructors** for each key (`Status.Loading("fetching")` → `{ tag: "Loading", msg: "fetching" }`)
- **`match(value, arms)`** — exhaustive matcher bound to this union
- **`_tags`** — `string[]` of installed variant names, in definition order (`undefined` constructor holes are omitted)

`tag` is always the constructor name, even if the payload also has a `tag` field. It is non-writable and non-configurable so later assignment cannot reroute `match`. Names `match`, `_tags`, `__proto__`, `prototype`, and `constructor` are reserved (type error and runtime throw). `__proto__` is rejected at runtime even when written via `Object.create(null)`.

### `match(value, arms)`

Standalone exhaustive matcher for any `{ tag: string }` union. Same runtime behavior as the bound `match` on a matchable namespace. Only own, callable arms are considered — a missing arm is never taken from `Object.prototype`.

### `MatchableOf<T>`

Extracts the tagged-union type from a `createMatchable` result so you can write `type Status = MatchableOf<typeof Status>`.

### `MatchArms<T, R>`

The arm map type used by `match`: one function per `T["tag"]`, each receiving that variant’s payload.

## Why this pattern

| Need | What you get |
| --- | --- |
| Compile-time exhaustiveness | Adding a variant without updating `match` is a type error |
| Runtime constructors | `Status.Success(1)` instead of hand-written `{ tag: "Success", data: 1 }` |
| Enumerable keys | `_tags` lists variants for logs, serializers, and UI without a separate enum |

This is the TypeScript analogue of a Rust `enum` plus `match`: a closed set of tagged values, constructed in one place, destructured exhaustively everywhere else.

## License

MIT
