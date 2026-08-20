import { createRequire } from "node:module";
import { createMatchable as esmCreate, match as esmMatch } from "../dist/index.js";

const require = createRequire(import.meta.url);
const cjs = require("../dist/index.cjs");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function smoke(api, label) {
  assert(typeof api.createMatchable === "function", `${label}: createMatchable`);
  assert(typeof api.match === "function", `${label}: match`);

  const Status = api.createMatchable({
    Idle: () => ({}),
    Ready: (n) => ({ n }),
  });
  const value = Status.Ready(1);
  assert(value.tag === "Ready", `${label}: tag`);
  assert(value.n === 1, `${label}: payload`);

  const viaBound = Status.match(value, {
    Idle: () => "idle",
    Ready: ({ n }) => `n=${n}`,
  });
  assert(viaBound === "n=1", `${label}: bound match`);

  const viaStandalone = api.match(value, {
    Idle: () => "idle",
    Ready: ({ n }) => `n=${n}`,
  });
  assert(viaStandalone === "n=1", `${label}: standalone match`);
  assert(
    JSON.stringify(Status._tags) === JSON.stringify(["Idle", "Ready"]),
    `${label}: _tags`,
  );
}

smoke({ createMatchable: esmCreate, match: esmMatch }, "esm");
smoke(cjs, "cjs");
console.log("dist smoke ok (esm + cjs)");
