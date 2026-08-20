/**
 * Tiny API-client “app”: one runtime matchable, generic `ApiResult<TData>`.
 *
 * Endpoints return different `data` types without creating new matchables.
 * `Cached` is an extra branch so specialization cannot drop unused variants.
 */
import {
  createMatchable,
  type MatchableOf,
  type TagMismatch,
} from "../src/index.js";

export type User = { id: string; name: string };
export type Post = { id: string; title: string };
export type ApiError = { code: number; message: string };

export const ApiResult = createMatchable({
  Idle: () => ({}),
  Loading: (msg: string) => ({ msg }),
  Success: (data: unknown) => ({ data }),
  Error: (err: unknown) => ({ err }),
  Cached: (at: Date) => ({ at }),
});

export type ApiResult<TData, TErr = unknown> = MatchableOf<
  typeof ApiResult,
  TData,
  TErr
>;

const users: Record<string, User> = {
  "1": { id: "1", name: "ada" },
};

const posts: Record<string, Post> = {
  "9": { id: "9", title: "notes" },
};

const cachedAt = new Date("2026-01-01T00:00:00.000Z");

export function getUser(id: string): ApiResult<User, ApiError> {
  if (id === "cached") {
    return ApiResult.Cached(cachedAt);
  }
  if (id === "loading") {
    return ApiResult.Loading("fetching user");
  }
  const found = users[id];
  if (found === undefined) {
    return ApiResult.Error({
      code: 404,
      message: "user not found",
    });
  }
  return ApiResult.Success(found);
}

export function getPost(id: string): ApiResult<Post, ApiError> {
  const found = posts[id];
  if (found === undefined) {
    return ApiResult.Error({
      code: 404,
      message: "post not found",
    });
  }
  return ApiResult.Success(found);
}

export function handleUser(result: ApiResult<User, ApiError>): string {
  return ApiResult.match(result, {
    Idle: () => "idle",
    Loading: ({ msg }) => msg,
    Success: ({ data }) => data.name,
    Error: ({ err }) => `${err.code}: ${err.message}`,
    Cached: ({ at }) => at.toISOString(),
  });
}

export function handlePost(result: ApiResult<Post, ApiError>): string {
  return ApiResult.match(result, {
    Idle: () => "idle",
    Loading: ({ msg }) => msg,
    Success: ({ data }) => data.title,
    Error: ({ err }) => `${err.code}: ${err.message}`,
    Cached: ({ at }) => at.toISOString(),
  });
}

export function readData<TData>(result: ApiResult<TData>): TData | undefined {
  return ApiResult.match(result, {
    Idle: () => undefined,
    Loading: () => undefined,
    Success: ({ data }) => data,
    Error: () => undefined,
    Cached: () => undefined,
  });
}

export function loadPage(userId: string, postId: string) {
  return ApiResult.merge(getUser(userId), getPost(postId));
}

function isTagMismatch(err: unknown): err is TagMismatch {
  return (
    typeof err === "object" &&
    err !== null &&
    "reason" in err &&
    err.reason === "tag-mismatch"
  );
}

export function handlePage(
  result: ReturnType<typeof loadPage>,
): string {
  return ApiResult.match(result, {
    Idle: () => "idle",
    Loading: ({ msg }) => msg.join(", "),
    Success: ({ data: [user, post] }) => `${user.name}: ${post.title}`,
    Error: ({ err }) => {
      if (isTagMismatch(err)) {
        return `mismatch: ${err.tags.join(",")}`;
      }
      const [first] = err;
      if (first === undefined) {
        return "error";
      }
      return `${first.code}: ${first.message}`;
    },
    Cached: ({ at }) => at[0]?.toISOString() ?? "",
  });
}
