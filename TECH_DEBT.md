# Tech debt

Priority order. Lower ID is higher priority.

| ID | Priority | Item |
| --- | --- | --- |
| TD-03 | Medium | Reject reserved variant names at the type level |
| TD-04 | Medium | Remove `as any` from constructor assignment |
| TD-05 | Medium | Derive `_tags` from installed constructors |
| TD-07 | Medium | Test the published `dist/` artifact |
| TD-08 | Low | Drop `unrun` on Node 22.18+ |
| TD-09 | Low | Point `repository` / `homepage` at the public host |
| TD-10 | Low | Add publint / Are The Types Wrong / npm provenance |
| TD-11 | Low | Document payload-spread semantics |
| TD-12 | Low | Wildcard `_` arm (feature, not a fix) |

## TD-03 — Reject reserved variant names at the type level

`match`, `_tags`, `__proto__`, `prototype`, and `constructor` are rejected at runtime only. TypeScript still accepts `createMatchable({ match: () => ({}) })` until it throws.

**Suggested fix:** Constrain `Defs` so those keys are a type error.

## TD-04 — Remove `as any` from constructor assignment

The `createMatchable` loop casts constructors `as any` because TypeScript cannot prove the per-key assignment. Runtime behavior is correct.

**Suggested fix:** A typed `Object.defineProperty` helper, or a mapped construction that avoids the loop-wide union.

## TD-05 — Derive `_tags` from installed constructors

`_tags` is `Object.keys(defs)`. A hole like `{ Idle: undefined }` still lists `Idle` with no constructor.

**Suggested fix:** Record keys that actually received a constructor, or skip `undefined` entries in both the constructor map and `_tags`.

## TD-07 — Test the published `dist/` artifact

Vitest imports `src/`, not `dist/`. Dual-package ESM/CJS output was smoke-tested by hand.

**Suggested fix:** A post-build smoke test that `import`s `dist/index.js` and `require`s `dist/index.cjs`.

## TD-08 — Drop `unrun` on Node 22.18+

`unrun` exists so tsdown can load `tsdown.config.ts` on Node versions without native TypeScript stripping.

**Suggested fix:** Once the toolchain is Node 22.18+, rely on tsdown’s native loader and remove the optional peer.

## TD-09 — Point `repository` / `homepage` at the public host

`package.json` currently points at Origin. Fine until the package is published to npm or mirrored to GitHub.

**Suggested fix:** Update `repository`, `homepage`, and `bugs` when the public URL is known.

## TD-10 — Add publint / Are The Types Wrong / npm provenance

No dual-package lint, types-export check, or provenance on publish.

**Suggested fix:** Optional tsdown peers (`publint`, `@arethetypeswrong/core`) in `prepublishOnly`, plus npm provenance when publishing.

## TD-11 — Document payload-spread semantics

Payload spread copies enumerable own fields only. Class instances lose methods and the prototype, which is expected but not documented.

**Suggested fix:** A short README note: constructors should return plain objects.

## TD-12 — Wildcard `_` arm (feature, not a fix)

Exhaustiveness is the point of this library. A Rust-style `_` default arm would be a new feature, not a bug fix.

**Suggested fix:** Only if a non-exhaustive escape hatch is explicitly wanted.

## Completed

| ID | Item | Notes |
| --- | --- | --- |
| TD-01 | Lock or freeze constructor `tag` | `tag` is defined last with `writable: false` and `configurable: false`. Payload fields stay mutable. |
| TD-02 | Make `MatchableOf` inference robust | Phantom `MatchableBrand` on the namespace; `MatchableOf` no longer reads `match` parameters. |
| TD-06 | Add CI that runs typecheck, test, and build | `.github/workflows/ci.yml` runs `pnpm typecheck`, `pnpm test`, and `pnpm build` on `main` and every PR. Connect Depot or Buildkite on the Origin Apps tab so the workflow actually executes. |
