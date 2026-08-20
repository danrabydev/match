import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const esmPath = join(root, "../dist/index.js");
const cjsPath = join(root, "../dist/index.cjs");
if (!existsSync(esmPath) || !existsSync(cjsPath)) {
  throw new Error("dist missing; run pnpm build first");
}

const {
  createMatchable: esmCreate,
  match: esmMatch,
  merge: esmMerge,
} = await import("../dist/index.js");
const cjs = createRequire(import.meta.url)("../dist/index.cjs");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function smoke(api, label) {
  assert(typeof api.createMatchable === "function", `${label}: createMatchable`);
  assert(typeof api.match === "function", `${label}: match`);
  assert(typeof api.merge === "function", `${label}: merge`);

  const Status = api.createMatchable({
    Idle: () => ({}),
    Ready: (n) => ({ n }),
    Error: (err) => ({ err }),
  });
  const value = Status.Ready(1);
  assert(value.tag === "Ready", `${label}: tag`);
  assert(value.n === 1, `${label}: payload`);

  const viaBound = Status.match(value, {
    Idle: () => "idle",
    Ready: ({ n }) => `n=${n}`,
    Error: () => "err",
  });
  assert(viaBound === "n=1", `${label}: bound match`);

  const viaStandalone = api.match(value, {
    Idle: () => "idle",
    Ready: ({ n }) => `n=${n}`,
    Error: () => "err",
  });
  assert(viaStandalone === "n=1", `${label}: standalone match`);
  assert(
    JSON.stringify(Status._tags) === JSON.stringify(["Idle", "Ready", "Error"]),
    `${label}: _tags`,
  );

  const zipped = api.merge(Status, Status.Ready(1), Status.Ready(2));
  assert(zipped.tag === "Ready", `${label}: merge tag`);
  assert(
    JSON.stringify(zipped.n) === JSON.stringify([1, 2]),
    `${label}: merge zip`,
  );
  const boundMerge = Status.merge(Status.Ready(1), Status.Idle());
  assert(boundMerge.tag === "Error", `${label}: merge mismatch`);
  assert(boundMerge.err.reason === "tag-mismatch", `${label}: TagMismatch`);
}

smoke(
  { createMatchable: esmCreate, match: esmMatch, merge: esmMerge },
  "esm",
);
smoke(cjs, "cjs");
console.log("dist smoke ok (esm + cjs)");
