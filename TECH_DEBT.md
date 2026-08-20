# Tech debt

Priority order. Lower ID is higher priority.

| ID | Priority | Item |
| --- | --- | --- |
| TD-08 | Low | Drop `unrun` on Node 22.18+ |
| TD-09 | Low | Point `repository` / `homepage` at the public host |
| TD-10 | Low | Add publint / Are The Types Wrong / npm provenance |
| TD-11 | Low | Document payload-spread semantics |
| TD-12 | Low | Wildcard `_` arm (feature, not a fix) |

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
| TD-03 | Reject reserved variant names at the type level | Literal reserved keys make `createMatchable` a type error. Dynamic/`Record<string, …>` keys still throw at runtime (`__proto__`). |
| TD-04 | Remove `as any` from constructor assignment | `bindVariantCtor` types each constructor; loop no longer uses `as any`. |
| TD-05 | Derive `_tags` from installed constructors | `_tags` records keys that received a constructor; `undefined` holes are omitted. |
| TD-07 | Test the published `dist/` artifact | `scripts/test-dist.mjs` imports ESM and requires CJS after `pnpm build`; wired into `check` and CI. |
| TD-06 | Add CI that runs typecheck, test, and build | `.github/workflows/ci.yml` runs `pnpm typecheck`, `pnpm test`, and `pnpm build` on `main` and every PR. Connect Depot or Buildkite on the Origin Apps tab so the workflow actually executes. |
