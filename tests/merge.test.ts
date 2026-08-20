import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createMatchable,
  merge,
  type MatchableOf,
  type TagMismatch,
} from "../src/index.js";

type User = { id: string; name: string };
type Post = { id: string; title: string };
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

describe("merge", () => {
  it("zips Success data into a tuple", () => {
    const user = ApiNs.Success({ id: "1", name: "ada" });
    const post = ApiNs.Success({ id: "9", title: "notes" });
    const combined = merge(ApiNs, user, post);
    expect(combined).toEqual({
      tag: "Success",
      data: [
        { id: "1", name: "ada" },
        { id: "9", title: "notes" },
      ],
    });
    expectTypeOf(combined).toEqualTypeOf<{
      tag: "Success";
      data: [User, Post];
    }>();
    const viaBound = ApiNs.merge(user, post);
    expect(viaBound).toEqual(combined);
  });

  it("zips matching Error err into a tuple", () => {
    const a = ApiNs.Error({ code: 1, message: "a" });
    const b = ApiNs.Error({ code: 2, message: "b" });
    const combined = merge(ApiNs, a, b);
    expect(combined.tag).toBe("Error");
    expect(combined).toEqual({
      tag: "Error",
      err: [
        { code: 1, message: "a" },
        { code: 2, message: "b" },
      ],
    });
  });

  it("zips Loading.msg and keeps Idle empty", () => {
    expect(merge(ApiNs, ApiNs.Loading("a"), ApiNs.Loading("b"))).toEqual({
      tag: "Loading",
      msg: ["a", "b"],
    });
    expect(merge(ApiNs, ApiNs.Idle(), ApiNs.Idle())).toEqual({ tag: "Idle" });
  });

  it("returns TagMismatch Error when tags differ", () => {
    const combined = merge(
      ApiNs,
      ApiNs.Success({ id: "1", name: "ada" }),
      ApiNs.Loading("fetching"),
    );
    expect(combined.tag).toBe("Error");
    const err = (combined as { tag: "Error"; err: TagMismatch }).err;
    expect(err).toEqual({
      reason: "tag-mismatch",
      tags: ["Success", "Loading"],
    });
    expectTypeOf<TagMismatch>().toMatchTypeOf<{
      reason: "tag-mismatch";
      tags: string[];
    }>();
  });

  it("locks tag on the merged value", () => {
    const combined = merge(ApiNs, ApiNs.Idle(), ApiNs.Idle());
    expect(() => {
      (combined as { tag: string }).tag = "Success";
    }).toThrow(TypeError);
  });

  it("throws if the namespace has no Error variant", () => {
    const NoErr = createMatchable({
      Ok: () => ({}),
    });
    expect((NoErr as { merge?: unknown }).merge).toBeUndefined();
    expect(() =>
      merge(NoErr as never, NoErr.Ok() as never, NoErr.Ok() as never),
    ).toThrowError("merge requires an Error variant");
    // @ts-expect-error merge requires Error
    NoErr.merge;
  });

  it("does not type merge when Error has no err field", () => {
    const Msg = createMatchable({
      Ok: () => ({}),
      Error: (message: string) => ({ message }),
    });
    // @ts-expect-error Error payload must include err
    Msg.merge;
  });

  it("types a service return as Success [User, Post]", () => {
    function loadPage(
      user: Api<User, ApiError>,
      post: Api<Post, ApiError>,
    ) {
      return ApiNs.merge(user, post);
    }
    const page = loadPage(
      ApiNs.Success({ id: "1", name: "ada" }),
      ApiNs.Success({ id: "9", title: "notes" }),
    );
    if (page.tag === "Success") {
      expectTypeOf(page.data).toEqualTypeOf<[User, Post]>();
      expect(page.data[0].name).toBe("ada");
      expect(page.data[1].title).toBe("notes");
    } else {
      expect.fail("expected Success");
    }
  });
});
