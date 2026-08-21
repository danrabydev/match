/**
 * Feature catalog for @danrabydev/match.
 *
 * Each numbered section is a complete, typechecked example. Runtime
 * behavior is asserted from tests/examples.test.ts.
 */
import {
  createMatchable,
  diagnostics,
  match,
  peeker,
  peekTrace,
  type MatchableOf,
  type MatchArms,
} from "../src/index.js";

export type User = { id: string; name: string };
export type ApiError = { code: number; message: string };

const user: User = { id: "1", name: "ada" };

// ---------------------------------------------------------------------------
// 1. Constructors and tags
// ---------------------------------------------------------------------------

export const Status = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: number) => ({ data }),
  Error: (err: Error) => ({ err }),
});

export function constructorsExample() {
  return {
    idle: Status.Idle(),
    loading: Status.Loading("fetching"),
    success: Status.Success(42),
    error: Status.Error(new Error("boom")),
  };
}

// ---------------------------------------------------------------------------
// 2. MatchableOf — monomorphic union
// ---------------------------------------------------------------------------

export type Status = MatchableOf<typeof Status>;

export function monomorphicUnion(value: Status): Status["tag"] {
  return value.tag;
}

// ---------------------------------------------------------------------------
// 3. Generic alias X<TData> / X<TData, TErr>
// ---------------------------------------------------------------------------

export const Box = createMatchable({
  Empty: () => ({}),
  Success: (data: unknown) => ({ data }),
  Error: (err: unknown) => ({ err }),
});

export type Box<TData, TErr = unknown> = MatchableOf<typeof Box, TData, TErr>;

export function genericAliasExample(): Box<User, ApiError> {
  return Box.Success(user);
}

// ---------------------------------------------------------------------------
// 4. Bound Ns.match exhaustiveness
// ---------------------------------------------------------------------------

export function boundMatchExample(value: Status): string {
  return Status.match(value, {
    Idle: () => "waiting",
    Loading: ({ msg }) => `state: ${msg}`,
    Success: ({ data }) => `got ${data}`,
    Error: ({ err }) => err.message,
  });
}

// ---------------------------------------------------------------------------
// 5. Standalone match
// ---------------------------------------------------------------------------

export function standaloneMatchExample(value: Status): string {
  return match(value, {
    Idle: () => "waiting",
    Loading: ({ msg }) => `state: ${msg}`,
    Success: ({ data }) => `got ${data}`,
    Error: ({ err }) => err.message,
  });
}

// ---------------------------------------------------------------------------
// 6. MatchArms
// ---------------------------------------------------------------------------

export const statusArms: MatchArms<Status, string> = {
  Idle: () => "waiting",
  Loading: ({ msg }) => `state: ${msg}`,
  Success: ({ data }) => `got ${data}`,
  Error: ({ err }) => err.message,
};

export function matchArmsExample(value: Status): string {
  return Status.match(value, statusArms);
}

// ---------------------------------------------------------------------------
// 7. _tags — definition order; undefined holes omitted
// ---------------------------------------------------------------------------

export const Holes = createMatchable({
  Idle: () => ({}),
  Loading: undefined,
  Done: () => ({}),
} as unknown as {
  Idle: () => object;
  Loading: () => object;
  Done: () => object;
});

export function tagsExample() {
  return {
    status: Status._tags,
    holes: Holes._tags,
  };
}

// ---------------------------------------------------------------------------
// 8. Runtime unhandled variant
// ---------------------------------------------------------------------------

export function unhandledVariantExample(): string {
  const incomplete = {
    Idle: () => "waiting",
    Success: () => "ok",
    Error: () => "err",
  };
  return match(Status.Loading("x"), incomplete as never);
}

// ---------------------------------------------------------------------------
// 9. Locked tag — payload cannot forge or reassign
// ---------------------------------------------------------------------------

export const Guest = createMatchable({
  Guest: (body: { tag?: string; name: string }) => body,
});

export function lockedTagExample() {
  const forged = Guest.Guest({ tag: "Admin", name: "ada" });
  const name = Guest.match(forged, {
    Guest: ({ name }) => name,
  });
  return { forged, name, tag: forged.tag };
}

// ---------------------------------------------------------------------------
// 10. Plain-object payload copy (class methods dropped)
// ---------------------------------------------------------------------------

class BoxValue {
  constructor(readonly n: number) {}
  double() {
    return this.n * 2;
  }
}

export const Boxed = createMatchable({
  Value: (box: BoxValue) => box,
});

export function plainObjectCopyExample() {
  const value = Boxed.Value(new BoxValue(2));
  return {
    tag: value.tag,
    n: value.n,
    proto: Object.getPrototypeOf(value),
    hasDouble: Object.prototype.hasOwnProperty.call(value, "double"),
  };
}

// ---------------------------------------------------------------------------
// 11. Narrow constructor result vs widened union
// ---------------------------------------------------------------------------

export function narrowVsWideExample() {
  const idleOnly = Status.match(Status.Idle(), {
    Idle: () => "waiting",
  });
  const value: Status = Status.Idle();
  const allArms = Status.match(value, {
    Idle: () => "waiting",
    Loading: () => "loading",
    Success: () => "ok",
    Error: () => "err",
  });
  return { idleOnly, allArms };
}

// ---------------------------------------------------------------------------
// 12. Arity — extra MatchableOf args illegal without data / err
// ---------------------------------------------------------------------------

export const NoData = createMatchable({
  Idle: () => ({}),
  Done: () => ({}),
});

export const DataOnly = createMatchable({
  Success: (data: unknown) => ({ data }),
});

// @ts-expect-error no data field — second type argument is illegal
export type NoDataWithArg = MatchableOf<typeof NoData, User>;

// @ts-expect-error no err field — third type argument is illegal
export type DataOnlyWithErr = MatchableOf<typeof DataOnly, User, ApiError>;

// ---------------------------------------------------------------------------
// 13. Constraint — data must extend the constructor payload
// ---------------------------------------------------------------------------

// @ts-expect-error string does not extend number
export type StatusWithStringData = MatchableOf<typeof Status, string>;

// ---------------------------------------------------------------------------
// 14. Arms that throw as the error path
// ---------------------------------------------------------------------------

export function throwingArmExample(): string {
  return Status.match(Status.Error(new Error("fail")), {
    Idle: () => "waiting",
    Loading: () => "loading",
    Success: () => "ok",
    Error: ({ err }) => {
      throw err;
    },
  });
}

// ---------------------------------------------------------------------------
// 15. merge — same tag zips payloads; mixed tags become Error
// ---------------------------------------------------------------------------

export function mergeExample() {
  const ok = Status.merge(Status.Success(1), Status.Success(2));
  const mismatch = Status.merge(Status.Success(1), Status.Loading("x"));
  return { ok, mismatch };
}

// ---------------------------------------------------------------------------
// 16. peek — optional void observers; match still returns one R
// ---------------------------------------------------------------------------

export const logErrors = peeker("logErrors", {
  Error: ({ err }: { err: Error }) => {
    void err;
  },
});

export function peekExample() {
  const value = Status.Error(new Error("nope"));
  Status.peek(value, logErrors);
  Status.peek(value, { Loading: () => {} });
  const result = Status.match(value, {
    Idle: () => "waiting",
    Loading: () => "loading",
    Success: () => "ok",
    Error: () => "err",
  });
  return { same: Status.peek(value, {}) === value, result };
}

// ---------------------------------------------------------------------------
// 17. diagnostics — mask on the instance; trail is pull-based
// ---------------------------------------------------------------------------

export function diagnosticsExample() {
  const value = Status.Error(
    new Error("nope"),
    diagnostics({ enabled: true, branches: ["Error"] }),
  );
  Status.peek(value, logErrors);
  Status.match(value, {
    Idle: () => "waiting",
    Loading: () => "loading",
    Success: () => "ok",
    Error: () => "err",
  });
  return peekTrace(value);
}
