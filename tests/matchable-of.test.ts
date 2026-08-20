import { describe, expect, expectTypeOf, it } from "vitest";
import { createMatchable, type MatchableOf } from "../src/index.js";

const Status = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: number) => ({ data }),
  Error: (err: Error) => ({ err }),
});

type Status = MatchableOf<typeof Status>;

type User = { id: string; name: string };
type ApiError = { code: number; message: string };

const ApiNs = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: unknown) => ({ data }),
  Error: (err: unknown) => ({ err }),
  Cached: (at: Date) => ({ at }),
});

type Api<TData = unknown, TErr = unknown> = MatchableOf<
  typeof ApiNs,
  TData,
  TErr
>;

describe("MatchableOf", () => {
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

  it("specializes data and err while keeping other variants", () => {
    expectTypeOf<Api<User>>().toMatchTypeOf<
      | { tag: "Idle" }
      | { tag: "Loading"; msg: string }
      | { tag: "Success"; data: User }
      | { tag: "Error"; err: unknown }
      | { tag: "Cached"; at: Date }
    >();
    expectTypeOf<Api<User, ApiError>>().toMatchTypeOf<
      | { tag: "Idle" }
      | { tag: "Loading"; msg: string }
      | { tag: "Success"; data: User }
      | { tag: "Error"; err: ApiError }
      | { tag: "Cached"; at: Date }
    >();
    expectTypeOf<MatchableOf<typeof Status>>().toEqualTypeOf<Status>();
  });

  it("rejects a data type that does not extend the constructor payload", () => {
    // @ts-expect-error string does not extend number
    type _Bad = MatchableOf<typeof Status, string>;
  });

  it("rejects extra type arguments when the hole does not exist", () => {
    const NoData = createMatchable({
      Idle: () => ({}),
      Done: () => ({}),
    });
    // @ts-expect-error no data field, second type argument is illegal
    type _NoData = MatchableOf<typeof NoData, User>;

    const DataOnly = createMatchable({
      Success: (data: unknown) => ({ data }),
    });
    // @ts-expect-error no err field, third type argument is illegal
    type _DataOnly = MatchableOf<typeof DataOnly, User, ApiError>;
  });

  it("flows TData through bound match on a generic alias", () => {
    const result: Api<User> = ApiNs.Success({ id: "1", name: "ada" });
    const name = ApiNs.match(result, {
      Idle: () => "",
      Loading: () => "",
      Success: ({ data }) => data.name,
      Error: () => "",
      Cached: () => "",
    });
    expect(name).toBe("ada");
    expectTypeOf(name).toEqualTypeOf<string>();

    function readData<TData>(value: Api<TData>): TData | undefined {
      return ApiNs.match(value, {
        Idle: () => undefined,
        Loading: () => undefined,
        Success: ({ data }) => data,
        Error: () => undefined,
        Cached: () => undefined,
      });
    }
    expect(readData(result)).toEqual({ id: "1", name: "ada" });
  });

  it("still requires every arm for a widened generic union", () => {
    const check = (result: Api<User>) => {
      // @ts-expect-error Cached arm is required for exhaustiveness
      ApiNs.match(result, {
        Idle: () => "",
        Loading: () => "",
        Success: () => "",
        Error: () => "",
      });
    };
    check(ApiNs.Idle());
  });
});
