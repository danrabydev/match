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

  it("copies enumerable own fields only (class methods are dropped)", () => {
    class Box {
      constructor(readonly n: number) {}
      double() {
        return this.n * 2;
      }
    }
    const Boxed = createMatchable({
      Value: (box: Box) => box,
    });
    const value = Boxed.Value(new Box(2));
    expect(value.tag).toBe("Value");
    expect(value.n).toBe(2);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(
      Object.prototype.hasOwnProperty.call(value, "double"),
    ).toBe(false);
  });

  it("omits undefined constructor holes from _tags", () => {
    const Holes = createMatchable({
      Idle: () => ({}),
      Loading: undefined,
      Done: () => ({}),
    } as unknown as {
      Idle: () => object;
      Loading: () => object;
      Done: () => object;
    });
    expect(Holes._tags).toEqual(["Idle", "Done"]);
    expect(Holes.Loading).toBeUndefined();
    expect(Holes.Idle()).toEqual({ tag: "Idle" });
    expect(Holes.Done()).toEqual({ tag: "Done" });
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

describe("discriminant integrity", () => {
  it("does not let payload overwrite the constructor tag", () => {
    const Forged = createMatchable({
      Guest: (body: { tag?: string; name: string }) => body,
    });
    expect(Forged.Guest({ tag: "Admin", name: "ada" })).toEqual({
      tag: "Guest",
      name: "ada",
    });
    expect(
      Forged.match(Forged.Guest({ tag: "Admin", name: "ada" }), {
        Guest: ({ name }) => name,
      }),
    ).toBe("ada");
  });

  it("locks tag so later assignment cannot reroute match", () => {
    const value = Status.Idle();
    expect(() => {
      (value as { tag: string }).tag = "Success";
    }).toThrow(TypeError);
    expect(value.tag).toBe("Idle");
    expect(
      Status.match(value, {
        Idle: () => "waiting",
        Loading: () => "loading",
        Success: () => "ok",
        Error: () => "err",
      }),
    ).toBe("waiting");
  });

  it("rejects redefine or delete of the locked tag", () => {
    const value = Status.Loading("fetching");
    expect(
      Object.getOwnPropertyDescriptor(value, "tag"),
    ).toEqual({
      value: "Loading",
      writable: false,
      enumerable: true,
      configurable: false,
    });
    expect(() => {
      Object.defineProperty(value, "tag", { value: "Success" });
    }).toThrow(TypeError);
    expect(Reflect.deleteProperty(value, "tag")).toBe(false);
    expect(value.tag).toBe("Loading");
  });

  it("still allows mutating non-tag payload fields", () => {
    const value = Status.Loading("fetching");
    value.msg = "still fetching";
    expect(value.msg).toBe("still fetching");
    expect(value.tag).toBe("Loading");
  });
});

describe("reserved variant names", () => {
  it("rejects reserved names at the type level", () => {
    expect(() =>
      // @ts-expect-error reserved variant name
      createMatchable({ match: () => ({}) }),
    ).toThrowError("reserved variant name: match");
    expect(() =>
      // @ts-expect-error reserved variant name
      createMatchable({ _tags: () => ({}) }),
    ).toThrowError("reserved variant name: _tags");
    expect(() =>
      // @ts-expect-error reserved variant name
      createMatchable({ constructor: () => ({}) }),
    ).toThrowError("reserved variant name: constructor");
    expect(() =>
      // @ts-expect-error reserved variant name
      createMatchable({ prototype: () => ({}) }),
    ).toThrowError("reserved variant name: prototype");
  });

  it("rejects match and _tags as variant names", () => {
    expect(() =>
      createMatchable({
        match: () => ({}),
      } as never),
    ).toThrowError("reserved variant name: match");
    expect(() =>
      createMatchable({
        _tags: () => ({}),
      } as never),
    ).toThrowError("reserved variant name: _tags");
  });

  it("rejects prototype-polluting variant names", () => {
    const protoDefs = Object.create(null) as Record<string, () => object>;
    protoDefs.__proto__ = () => ({});
    expect(() => createMatchable(protoDefs)).toThrowError(
      "reserved variant name: __proto__",
    );
    expect(() =>
      createMatchable({
        constructor: () => ({}),
      } as never),
    ).toThrowError("reserved variant name: constructor");
    expect(() =>
      createMatchable({
        prototype: () => ({}),
      } as never),
    ).toThrowError("reserved variant name: prototype");
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
  it("infers the tagged union from MatchableOf", () => {
    expectTypeOf<Status>().toMatchTypeOf<
      | { tag: "Idle" }
      | { tag: "Loading"; msg: string }
      | { tag: "Success"; data: number }
      | { tag: "Error"; err: Error }
    >();
    expectTypeOf<MatchableOf<typeof Status>>().toEqualTypeOf<Status>();
  });

  it("MatchableOf stays the union if match gains a leading parameter", () => {
    type WithLeadingMatchParam = typeof Status & {
      match: (
        ctx: { debug: true },
        value: Status,
        arms: never,
      ) => unknown;
    };
    expectTypeOf<
      MatchableOf<WithLeadingMatchParam>
    >().toEqualTypeOf<Status>();
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
