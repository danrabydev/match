import { describe, expect, expectTypeOf, it } from "vitest";
import { createMatchable, type MatchableOf } from "../src/index.js";

const Status = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: number) => ({ data }),
  Error: (err: Error) => ({ err }),
});

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
    expect(Object.getOwnPropertyDescriptor(value, "tag")).toEqual({
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
      createMatchable({ merge: () => ({}) }),
    ).toThrowError("reserved variant name: merge");
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
      createMatchable({ peek: () => ({}) }),
    ).toThrowError("reserved variant name: peek");
    expect(() =>
      // @ts-expect-error reserved variant name
      createMatchable({ withDiagnostics: () => ({}) }),
    ).toThrowError("reserved variant name: withDiagnostics");
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
    expect(() =>
      createMatchable({
        peek: () => ({}),
      } as never),
    ).toThrowError("reserved variant name: peek");
    expect(() =>
      createMatchable({
        withDiagnostics: () => ({}),
      } as never),
    ).toThrowError("reserved variant name: withDiagnostics");
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

describe("constructor inference", () => {
  type User = { id: string; name: string };
  type ApiError = { code: number; message: string };

  const ApiNs = createMatchable({
    Success: (data: unknown) => ({ data }),
    Error: (err: unknown) => ({ err }),
  });
  type Api<TData = unknown, TErr = unknown> = MatchableOf<
    typeof ApiNs,
    TData,
    TErr
  >;

  it("infers constructor payloads so Success/Error need no assertion", () => {
    const success = ApiNs.Success({ id: "1", name: "ada" });
    expectTypeOf(success).toEqualTypeOf<{ tag: "Success"; data: User }>();
    const assigned: Api<User, ApiError> = success;
    expect(assigned.tag).toBe("Success");

    const failed: Api<User, ApiError> = ApiNs.Error({
      code: 404,
      message: "nope",
    });
    expect(failed.tag).toBe("Error");
  });
});
