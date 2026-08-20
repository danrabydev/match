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

describe("prototype-safe arm lookup", () => {
  it("does not dispatch through inherited Object.prototype arms", () => {
    const original = Object.getOwnPropertyDescriptor(
      Object.prototype,
      "Loading",
    );
    Object.defineProperty(Object.prototype, "Loading", {
      configurable: true,
      value: () => "polluted",
    });
    try {
      expect(() =>
        match(Status.Loading("x"), {
          Idle: () => "waiting",
          Success: () => "ok",
          Error: () => "err",
        } as never),
      ).toThrowError("unhandled variant: Loading");
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(Object.prototype, "Loading");
      } else {
        Object.defineProperty(Object.prototype, "Loading", original);
      }
    }
  });
});

describe("type-level exhaustiveness", () => {
  it("requires every variant arm (enforced by tsc)", () => {
    const check = (value: Status) => {
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
      return complete;
    };
    expect(check(Status.Idle())).toBe("waiting");
  });

  it("only requires arms for the value's tags (constructor result is narrow)", () => {
    const idleOnly = Status.match(Status.Idle(), {
      Idle: () => "waiting",
    });
    expect(idleOnly).toBe("waiting");
    expectTypeOf(idleOnly).toEqualTypeOf<string>();
  });
});
