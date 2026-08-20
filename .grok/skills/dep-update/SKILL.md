---
name: dep-update
description: >
  Maintain and upgrade a TypeScript npm package (default: @danrabydev/match)
  against current and upcoming releases. Use when the task is "update
  dependencies", "dep update", "security refresh", "typescript bump",
  "check upcoming releases", "maintenance", or any scheduled UPDATE-SCHEDULE
  run. Triggers on: update, deps, dependencies, vulnerability, advisory,
  typescript release, node lts, tsdown, vitest, renovate, dependabot.
metadata:
  short-description: "Lookup current + upcoming TS/Node/tooling releases, apply upgrades, document near-future"
user-invocable: true
---

# Dependency & release update (Grok + Cursor)

This skill is the **single playbook** for a maintenance task. When the task is
set, do **not** only bump lockfile versions. Always:

1. Look up **current** published versions.
2. Look up **upcoming / future** versions (roadmaps, release candidates, LTS dates).
3. **Update code** when a current or imminent release changes APIs, types, or engines.
4. **Document near-future releases** in `docs/RELEASES-UPCOMING.md`.

Policy tables live in [docs/UPDATE-SCHEDULE.md](../../../docs/UPDATE-SCHEDULE.md).
Lookup sources live in [references/lookup.md](references/lookup.md).
Cadence rules live in [references/cadence.md](references/cadence.md).

## Triggers (when to run this skill)

Run the full procedure below if the user or scheduler says any of:

- update / deps / maintenance / security
- "check TypeScript" / "Node LTS" / "upcoming releases"
- a weekly, monthly, or quarterly UPDATE-SCHEDULE slot
- a high/critical advisory

Do **not** wait for the user to paste version numbers. Fetch them.

## Hard constraints

- Prefer **stability** over chasing nightlies and betas.
- **Do not auto-merge majors.** Majors get a dedicated PR and notes.
- **Do not add runtime dependencies** to `@danrabydev/match` without a strong reason (this library is zero-runtime-dep).
- Never skip typecheck + tests + build after a bump.
- Never invent release dates. If a date is unknown, write `TBD` and the source URL.

## Procedure (execute in this order)

### 0. Identify the package

- Default target: `@danrabydev/match` (pnpm + tsdown + vitest + TypeScript).
- If this repo is a different package, use **this** `package.json` as source of truth.
- Record: package name, current versions of `typescript`, `tsdown`, `vitest`, `@types/node`, `engines.node`, Node used in CI.

### 1. Inventory (current, in-repo)

Read:

- `package.json` / `pnpm-lock.yaml`
- `tsconfig.json`
- `tsdown.config.ts`
- CI workflows (`.github/workflows/*` or Origin CI)
- `docs/RELEASES-UPCOMING.md` (prior notes — close or roll forward)

Run (when a shell is available):

```bash
pnpm outdated
pnpm audit --audit-level=high
node -v
```

### 2. Lookup — current published versions

Use web search / npm / GitHub. Required queries (see [references/lookup.md](references/lookup.md)):

| Tool | What to capture |
| --- | --- |
| TypeScript | Latest **stable** tag; latest **RC/beta** if any |
| Node.js | Current **Active LTS** and **Maintenance LTS** versions + EOL dates |
| tsdown | Latest stable; changelog breaking notes |
| vitest | Latest stable in the same major if possible |
| @types/node | Matches the **oldest Node we claim to support** |
| Advisories | GitHub Advisory DB + `pnpm audit` high/critical |

Write a short working table: `package | installed | latest stable | notes`.

### 3. Lookup — upcoming / future releases

This step is **mandatory**. Search, do not skip:

| Source | Capture |
| --- | --- |
| TypeScript roadmap / iteration plan / GitHub milestones | Next minor/major, target month, breaking themes |
| Node release calendar (nodejs.org) | Next LTS start, current LTS → Maintenance date, EOL |
| tsdown / Rolldown GitHub releases + issues labeled `breaking` | Next major, deprecations |
| vitest GitHub releases | Next major, pool/config changes |
| npm dist-tags (`next`, `beta`, `rc`) | Pre-releases that might land in the next 90 days |

If nothing is scheduled, still write: “No dated upcoming release found as of `<ISO date>`” plus the URLs you checked.

### 4. Decide: apply now vs document vs defer

Use [references/cadence.md](references/cadence.md) and `docs/UPDATE-SCHEDULE.md`.

| Situation | Action |
| --- | --- |
| High/critical advisory on a direct or transitive dep | Apply within 48h (patch or justify in the PR) |
| TypeScript **stable** minor, ≥ 1–2 weeks soak | Bump + typecheck; fix code if `tsc` errors |
| TypeScript **RC** / next iteration | Document in `RELEASES-UPCOMING.md`; do **not** bump prod unless the user asked |
| Node new Active LTS | Add to CI matrix after soak; keep oldest supported LTS until EOL policy says drop |
| tsdown/vitest **minor/patch** | Monthly bucket or now if security |
| Any **major** | Dedicated PR; update README engines; code changes for renamed APIs |
| Deprecation announced for a future version | Update code **now** to the replacement API so the future bump is mechanical |

**Code-ahead rule:** if an upcoming release deprecates an API we use, migrate to the replacement **in this task**, even if we stay on the current version. Document that the migration is forward-compatible.

### 5. Apply updates (current releases only)

1. Branch: `deps/<scope>-<version>` or `chore/deps-YYYY-MM`.
2. Bump with pnpm (`pnpm add -D typescript@<ver>` etc.). Do not hand-edit lockfile.
3. If TypeScript or Node types changed, update `tsconfig.json` (`target` / `lib`) only when required by the new compiler.
4. If tsdown config keys renamed, update `tsdown.config.ts` from **that version’s docs**, not memory.
5. Fix source in `src/` and tests until green.

Verification (required):

```bash
pnpm typecheck
pnpm test
pnpm build
```

Spot-check `dist/` exports (`esm` + `cjs` + `.d.ts` / `.d.cts`) still match `package.json` `exports`.

### 6. Document near-future releases

Update [docs/RELEASES-UPCOMING.md](../../../docs/RELEASES-UPCOMING.md):

For **each** item in the next ~90 days (or next known train if later):

- Name + version train (e.g. TypeScript 6.x, Node 24 LTS)
- Expected window (month or date; `TBD` if unknown)
- Source URL
- Impact on this repo (none / types / engines / config / source)
- Planned action (watch / migrate API now / bump on date / drop Node X)
- Status: `watching` | `migrated-ahead` | `ready-to-bump` | `done`

Remove or move to a “Landed” section items that already shipped and were applied.

Also append a one-line **run log** at the bottom: date, agent (Grok/Cursor), what was bumped, link to PR if any.

### 7. Finish the task

PR / commit message must include:

- Current bumps (old → new)
- Advisories addressed (or “none”)
- Upcoming items documented (names + windows)
- Commands run and results (typecheck/test/build)

Do not leave `RELEASES-UPCOMING.md` stale.

## Cursor vs Grok

| Host | How to attach this skill |
| --- | --- |
| **Grok** | Skill path: `.grok/skills/dep-update/SKILL.md`. Load this file + `docs/UPDATE-SCHEDULE.md` when the task matches the description. |
| **Cursor** | Project rule: `.cursor/rules/dep-update.mdc` (alwaysApply false; globs + description). Also listed in `AGENTS.project.md`. When the user says “run dep update”, `@` this skill or open this file first. |

Same procedure. Same output files. Do not fork the policy.

## Out of scope

- Rewriting the public match API “while we’re here”
- Adding ESLint/Biome/Changesets unless the user asked
- Publishing to npm (unless the task explicitly says publish)
- Chasing TypeScript nightlies
