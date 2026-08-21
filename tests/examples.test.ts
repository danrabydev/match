import { describe, expect, expectTypeOf, it } from "vitest";
import {
  Api,
  ApiResult,
  apiMessages,
  getPost,
  getUser,
  handlePage,
  handlePost,
  handleUser,
  loadPage,
  readData,
  type Post,
  type User,
} from "../examples/api-client.js";
import {
  Box,
  Boxed,
  constructorsExample,
  boundMatchExample,
  diagnosticsExample,
  genericAliasExample,
  lockedTagExample,
  matchArmsExample,
  monomorphicUnion,
  narrowVsWideExample,
  peekExample,
  plainObjectCopyExample,
  standaloneMatchExample,
  Status,
  tagsExample,
  throwingArmExample,
  unhandledVariantExample,
  mergeExample,
  type ApiError,
  type Box as BoxOf,
  type Status as StatusUnion,
} from "../examples/catalog.js";

describe("examples/api-client", () => {
  it("returns specialized Success data per endpoint", () => {
    expect(handleUser(getUser("1"))).toBe("ada");
    expect(handlePost(getPost("9"))).toBe("notes");
    expect(readData(getUser("1"))).toEqual({ id: "1", name: "ada" });
    expect(readData(getPost("9"))).toEqual({ id: "9", title: "notes" });
    expectTypeOf(readData(getUser("1"))).toEqualTypeOf<User | undefined>();
    expectTypeOf(readData(getPost("9"))).toEqualTypeOf<Post | undefined>();
  });

  it("keeps non-data branches (Loading, Error, Cached)", () => {
    expect(handleUser(getUser("loading"))).toBe("fetching user");
    expect(handleUser(getUser("missing"))).toBe("404: user not found");
    expect(handleUser(getUser("cached"))).toBe("2026-01-01T00:00:00.000Z");
    expect(handlePost(getPost("missing"))).toBe("404: post not found");
  });

  it("still requires the extra Cached arm on a widened value", () => {
    const check = (result: ApiResult<User, ApiError>) => {
      // @ts-expect-error Cached arm is required
      ApiResult.match(result, {
        Idle: () => "",
        Loading: () => "",
        Success: () => "",
        Error: () => "",
      });
    };
    check(ApiResult.Idle());
  });

  it("15. merge zips two successes and errors on mixed tags", () => {
    expect(handlePage(loadPage("1", "9"))).toBe("ada: notes");
    expect(handlePage(loadPage("loading", "9"))).toBe(
      "mismatch: Loading,Success",
    );
  });

  it("imposes Error peekers from an Api consumer", () => {
    apiMessages.length = 0;
    const api = new Api();
    const missing = api.getUser("missing");
    expect(apiMessages).toEqual(["404: user not found"]);
    expect(handleUser(missing)).toBe("404: user not found");
    apiMessages.length = 0;
    expect(handleUser(api.getUser("1"))).toBe("ada");
    expect(apiMessages).toEqual([]);
  });
});

describe("examples/catalog", () => {
  it("1. constructors produce tag + payload", () => {
    const values = constructorsExample();
    expect(values.idle).toEqual({ tag: "Idle" });
    expect(values.loading).toEqual({ tag: "Loading", msg: "fetching" });
    expect(values.success).toEqual({ tag: "Success", data: 42 });
    expect(values.error.tag).toBe("Error");
  });

  it("2. MatchableOf is the monomorphic union", () => {
    expect(monomorphicUnion(Status.Idle())).toBe("Idle");
    expectTypeOf<StatusUnion>().toMatchTypeOf<
      | { tag: "Idle" }
      | { tag: "Loading"; msg: string }
      | { tag: "Success"; data: number }
      | { tag: "Error"; err: Error }
    >();
  });

  it("3. generic alias X<TData, TErr>", () => {
    const boxed = genericAliasExample();
    expect(Box.match(boxed, {
      Empty: () => undefined,
      Success: ({ data }) => data,
      Error: () => undefined,
    })).toEqual({ id: "1", name: "ada" });
    expectTypeOf(boxed).toMatchTypeOf<BoxOf<User, ApiError>>();
  });

  it("4–6. bound match, standalone match, MatchArms", () => {
    const loading = Status.Loading("fetching");
    expect(boundMatchExample(loading)).toBe("state: fetching");
    expect(standaloneMatchExample(loading)).toBe("state: fetching");
    expect(matchArmsExample(Status.Success(7))).toBe("got 7");
  });

  it("7. _tags lists installed constructors in definition order", () => {
    expect(tagsExample()).toEqual({
      status: ["Idle", "Loading", "Success", "Error"],
      holes: ["Idle", "Done"],
    });
  });

  it("8. missing arm throws at runtime", () => {
    expect(() => unhandledVariantExample()).toThrowError(
      "unhandled variant: Loading",
    );
  });

  it("9. tag is the constructor name and is locked", () => {
    const { forged, name, tag } = lockedTagExample();
    expect(tag).toBe("Guest");
    expect(name).toBe("ada");
    expect(forged).toEqual({ tag: "Guest", name: "ada" });
    expect(() => {
      (forged as { tag: string }).tag = "Admin";
    }).toThrow(TypeError);
  });

  it("10. class payloads are copied as plain objects", () => {
    const copied = plainObjectCopyExample();
    expect(copied.tag).toBe("Value");
    expect(copied.n).toBe(2);
    expect(copied.proto).toBe(Object.prototype);
    expect(copied.hasDouble).toBe(false);
    expectTypeOf(Boxed.Value).toBeFunction();
  });

  it("11. narrow constructor results need only their own arm", () => {
    expect(narrowVsWideExample()).toEqual({
      idleOnly: "waiting",
      allArms: "waiting",
    });
  });

  it("14. throwing arms propagate", () => {
    expect(() => throwingArmExample()).toThrowError("fail");
  });

  it("15. merge zips Success and mismatches to Error", () => {
    const { ok, mismatch } = mergeExample();
    expect(ok).toEqual({ tag: "Success", data: [1, 2] });
    expect(mismatch.tag).toBe("Error");
  });

  it("16. peek is identity and match still returns one R", () => {
    expect(peekExample()).toEqual({ same: true, result: "err" });
  });

  it("17. diagnostics records peek then match on an enabled Error", () => {
    const trail = diagnosticsExample();
    expect(trail[0]).toMatchObject({
      kind: "peek",
      peeker: "logErrors",
      tag: "Error",
      hit: true,
    });
    expect(trail[1]).toMatchObject({
      kind: "match",
      tag: "Error",
      peekers: ["logErrors"],
    });
  });
});
