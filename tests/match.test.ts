import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createMatchable,
  match,
  type MatchableOf,
} from "../src/index.js";

const Status = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: number) => ({ data }),
  Error: (err: Error) => ({ err }),
});

type Status = MatchableOf<typeof Status>;

describe("createMatchable constructors", () => {
  it("produce the correct tag and payload for every variant", () => {
    expect(Status.Idle()).toEqual({ tag: "Idle" });
    expect(Status.Loading("fetching")).toEqual({
      tag: "Loading",
      msg: "fetching",
    });
    expect(Status.Success(42)).toEqual({ tag: "Success", data: 42 });

    const err = new Error("boom");
    expect(Status.Error(err)).toEqual({ tag: "Error", err });
  });

  it("exposes enumerable variant keys on _tags", () => {
    expect(Status._tags).toEqual(["Idle", "Loading", "Success", "Error"]);
  });
});

describe("exhaustive match", () => {
  const arms = {
    Idle: () => "waiting",
    Loading: ({ msg }: { msg: string }) => `state: ${msg}`,
    Success: ({ data }: { data: number }) => `got ${data}`,
    Error: ({ err }: { err: Error }) => err.message,
  };

  it("returns the value from the matching arm", () => {
    expect(Status.match(Status.Idle(), arms)).toBe("waiting");
    expect(Status.match(Status.Loading("fetching"), arms)).toBe(
      "state: fetching",
    );
    expect(Status.match(Status.Success(7), arms)).toBe("got 7");
    expect(Status.match(Status.Error(new Error("nope")), arms)).toBe("nope");
  });

  it("works through the standalone match helper", () => {
    const value: Status = Status.Success(99);
    expect(match(value, arms)).toBe("got 99");
  });
});

describe("missing arm", () => {
  it("throws at runtime when a variant has no handler", () => {
    const incomplete = {
      Idle: () => "waiting",
      Success: () => "ok",
      Error: () => "err",
    };

    expect(() =>
      match(Status.Loading("fetching"), incomplete as never),
    ).toThrowError("unhandled variant: Loading");
  });
});

describe("arms can throw", () => {
  it("propagates thrown errors as an exit strategy", () => {
    expect(() =>
      Status.match(Status.Error(new Error("fail")), {
        Idle: () => "waiting",
        Loading: () => "loading",
        Success: () => "ok",
        Error: ({ err }) => {
          throw err;
        },
      }),
    ).toThrowError("fail");
  });
});

describe("type-level exhaustiveness", () => {
  it("infers the tagged union from MatchableOf", () => {
    expectTypeOf<Status>().toMatchTypeOf<
      | { tag: "Idle" }
      | { tag: "Loading"; msg: string }
      | { tag: "Success"; data: number }
      | { tag: "Error"; err: Error }
    >();
  });

  it("requires every variant arm (enforced by tsc)", () => {
    const value: Status = Status.Idle();

    const complete = Status.match(value, {
      Idle: () => "waiting",
      Loading: ({ msg }) => msg,
      Success: ({ data }) => String(data),
      Error: ({ err }) => err.message,
    });
    expectTypeOf(complete).toEqualTypeOf<string>();

    // @ts-expect-error Error arm is required for exhaustiveness
    Status.match(value, {
      Idle: () => "waiting",
      Loading: ({ msg }) => msg,
      Success: ({ data }) => String(data),
    });
  });
});
