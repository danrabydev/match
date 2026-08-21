import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createMatchable,
  match,
  peek,
  peeker,
  type MatchableOf,
  type MatchArms,
  type PeekArms,
} from "../src/index.js";

const Status = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: number) => ({ data }),
  Error: (err: Error) => ({ err }),
});

type Status = MatchableOf<typeof Status>;

const Box = createMatchable({
  Success: (data: unknown) => ({ data }),
  Error: (err: unknown) => ({ err }),
  Idle: () => ({}),
});

type Box<T, E = unknown> = MatchableOf<typeof Box, T, E>;

describe("peek identity", () => {
  it("returns the same object whether an arm ran or not", () => {
    const value = Status.Loading("fetching");
    expect(Status.peek(value, {})).toBe(value);
    expect(Status.peek(value, { Loading: () => {} })).toBe(value);
    expect(peek(value, { Loading: () => {} })).toBe(value);
  });

  it("treats empty arms as identity", () => {
    const value = Status.Idle();
    expect(Status.peek(value, {})).toBe(value);
    expectTypeOf<PeekArms<Status>>().toMatchTypeOf<{}>();
  });
});

describe("peek optional branching", () => {
  it("runs only the matching own arm and ignores others", () => {
    const seen: string[] = [];
    const value = Status.Error(new Error("boom"));
    Status.peek(value, {
      Error: ({ err }) => {
        seen.push(err.message);
      },
      Loading: () => {
        seen.push("loading");
      },
    });
    expect(seen).toEqual(["boom"]);
  });

  it("is a no-op when the tag has no arm", () => {
    const seen: string[] = [];
    Status.peek(Status.Success(1), {
      Error: () => {
        seen.push("error");
      },
    });
    expect(seen).toEqual([]);
  });

  it("discards the arm return (toast ids, as never replacements)", () => {
    const value = Status.Success(1);
    const out = Status.peek(value, {
      Success: () => 1 as unknown as void,
    });
    expect(out).toBe(value);
    const replaced = Status.peek(value, {
      Success: () => ({ tag: "Idle" }) as unknown as void,
    });
    expect(replaced).toBe(value);
    expect(replaced.tag).toBe("Success");
  });
});

describe("peek then match", () => {
  it("two-statement form: peek then exhaustive match on the same value", () => {
    const seen: string[] = [];
    const value = Status.Error(new Error("nope"));
    Status.peek(value, {
      Error: ({ err }) => {
        seen.push(err.message);
      },
    });
    const result = Status.match(value, {
      Idle: () => "waiting",
      Loading: () => "loading",
      Success: () => "ok",
      Error: () => "err",
    });
    expect(seen).toEqual(["nope"]);
    expect(result).toBe("err");
  });
});

describe("peek types", () => {
  it("allows a single-tag PeekArms; MatchArms still requires every tag", () => {
    const errorOnly: PeekArms<Status> = {
      Error: () => {},
    };
    Status.peek(Status.Idle(), errorOnly);

    const check = (value: Status) => {
      // @ts-expect-error Error arm is required for exhaustiveness
      Status.match(value, {
        Idle: () => "waiting",
        Loading: () => "loading",
        Success: () => "ok",
      });
    };
    check(Status.Idle());

    expectTypeOf({} as PeekArms<Status>).not.toEqualTypeOf(
      {} as MatchArms<Status, string>,
    );
  });

  it("bound extra arms are allowed; standalone extra arms are not", () => {
    const idle = Status.Idle();
    Status.peek(idle, {
      Idle: () => {},
      Loading: () => {},
    });
    peek(idle, {
      Idle: () => {},
      // @ts-expect-error standalone peek has no extra arms
      Loading: () => {},
    });
  });

  it("preserves a narrowed constructor result", () => {
    const loading = Status.peek(Status.Loading("x"), {
      Loading: () => {},
    });
    expectTypeOf(loading).toEqualTypeOf<{ tag: "Loading"; msg: string }>();
  });

  it("types the arm argument as Readonly (payload T unchanged)", () => {
    Status.peek(Status.Error(new Error("x")), {
      Error: (v) => {
        expectTypeOf(v).toMatchTypeOf<
          Readonly<{ tag: "Error"; err: Error }>
        >();
        // @ts-expect-error err is readonly on the envelope
        v.err = new Error("other");
      },
    });
  });

  it("generic ApiResult data is not widened by an Error-only peeker", () => {
    type User = { id: string; name: string };
    type Post = { id: string; title: string };
    const interceptErrors: PeekArms<Box<unknown>> = {
      Error: () => {},
    };
    const user = Box.Success({ id: "1", name: "ada" }) as Box<User>;
    const post = Box.Success({ id: "9", title: "notes" }) as Box<Post>;
    const afterUser = Box.peek(user, interceptErrors);
    const afterPost = Box.peek(post, interceptErrors);
    expectTypeOf(afterUser).toEqualTypeOf<Box<User>>();
    expectTypeOf(afterPost).toEqualTypeOf<Box<Post>>();
    expect(
      Box.match(afterUser, {
        Idle: () => undefined,
        Success: ({ data }) => data.name,
        Error: () => undefined,
      }),
    ).toBe("ada");
  });
});

describe("peek live value", () => {
  it("does not copy; payload writes in an arm are visible to match", () => {
    const value = Status.Loading("fetching");
    Status.peek(value, {
      Loading: (v) => {
        (v as { msg: string }).msg = "still fetching";
      },
    });
    expect(
      Status.match(value, {
        Idle: () => "",
        Loading: ({ msg }) => msg,
        Success: () => "",
        Error: () => "",
      }),
    ).toBe("still fetching");
  });

  it("still cannot retag", () => {
    const value = Status.Idle();
    expect(() => {
      Status.peek(value, {
        Idle: (v) => {
          (v as { tag: string }).tag = "Success";
        },
      });
    }).toThrow(TypeError);
    expect(value.tag).toBe("Idle");
  });

  it("passes any payload T by reference", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    const bytes = new Uint8Array([1, 2]);
    class Token {
      constructor(readonly n: number) {}
      twice() {
        return this.n * 2;
      }
    }
    const token = new Token(3);
    const Packed = createMatchable({
      Date: (data: Date) => ({ data }),
      Bytes: (data: Uint8Array) => ({ data }),
      Token: (data: Token) => ({ data }),
      Big: (data: bigint) => ({ data }),
    });
    Packed.peek(Packed.Date(at), {
      Date: (v) => {
        expect(v.data).toBe(at);
      },
    });
    Packed.peek(Packed.Bytes(bytes), {
      Bytes: (v) => {
        expect(v.data).toBe(bytes);
      },
    });
    const tok = Packed.Token(token);
    Packed.peek(tok, {
      Token: (v) => {
        expect(v.data).toBe(token);
        expect(v.data.twice()).toBe(6);
      },
    });
    expect(
      Packed.match(Packed.Big(1n), {
        Date: () => 0n,
        Bytes: () => 0n,
        Token: () => 0n,
        Big: ({ data }) => data,
      }),
    ).toBe(1n);
  });
});

describe("peek errors", () => {
  it("throws when the value has no tag", () => {
    expect(() => peek({} as never, {})).toThrowError(
      "peek value is missing tag",
    );
  });

  it("propagates a throwing arm", () => {
    expect(() =>
      Status.peek(Status.Error(new Error("fail")), {
        Error: () => {
          throw new Error("fail");
        },
      }),
    ).toThrowError("fail");
  });

  it("does not dispatch through inherited Object.prototype arms", () => {
    const original = Object.getOwnPropertyDescriptor(
      Object.prototype,
      "Loading",
    );
    Object.defineProperty(Object.prototype, "Loading", {
      configurable: true,
      value: () => {
        throw new Error("polluted");
      },
    });
    try {
      const value = Status.Loading("x");
      expect(Status.peek(value, {})).toBe(value);
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(Object.prototype, "Loading");
      } else {
        Object.defineProperty(Object.prototype, "Loading", original);
      }
    }
  });
});

describe("peeker", () => {
  it("returns the same arms object with a non-enumerable name", () => {
    const arms = { Error: () => {} };
    const named = peeker("logErrors", arms);
    expect(named).toBe(arms);
    expect(Object.keys(named)).toEqual(["Error"]);
    Status.peek(Status.Error(new Error("x")), named);
  });
});
