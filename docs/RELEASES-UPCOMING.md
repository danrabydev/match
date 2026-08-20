# Upcoming releases

Living log for **near-future** TypeScript, Node, and toolchain trains.
Updated by the `dep-update` skill on every maintenance task.

Agents must **look up** current sources (see `.grok/skills/dep-update/references/lookup.md`)
and replace the rows below. Do not leave this file with an old “Last checked” date.

**Last checked:** 2026-08-20

## Installed vs latest (this run)

| Package | Installed | Latest stable | Dist-tags (next / rc / beta) | Action |
| --- | --- | --- | --- | --- |
| typescript | 6.0.3 | **7.0.2** | `next` 7.1.0-dev.20260819.1; `rc` 7.0.1-rc; `beta` 6.0.0-beta | Stay on 6.0.3. 7.0 is a soaked major, but tsdown dts emit warns that 7.0 has no stable API. Dedicated bump after 7.1 or when dts is non-experimental. |
| tsdown | 0.22.14 | 0.22.14 | `rc` 0.23.0-rc.0; `beta` 0.23.0-beta.3 | Already latest stable. Document 0.23. |
| vitest | 4.1.11 | 4.1.11 | `rc` 5.0.0-rc.2; `beta` 5.0.0-beta.7 | Already latest 4.x. Advisories GHSA-g8mr-85jm-7xhm / GHSA-5xrq-8626-4rwp / GHSA-2h32-95rg-cppp fixed in 4.1.8+. Document 5.0. |
| @types/node | 26.2.0 | 26.2.0 | `latest` 26.2.0 | Current. Pin stays on latest; source does not use Node APIs. |
| unrun | 0.3.1 | 0.3.1 | `latest` 0.3.1 | Current. TD-08: drop once toolchain is Node 22.18+ everywhere. |
| pnpm | 10.33.3 (`packageManager`) | 11.22.0 (major) | — | Do not auto-merge major. |
| Node (CI / local) | CI 22 + 24; local 22.14.0 | Active LTS **24** (Krypton); Maintenance LTS **22** (Jod); Current **26** | — | Added 24 to CI this run. Do not drop 22 until EOL. |

`pnpm outdated` reported only `typescript` 6.0.3 → 7.0.2.
`pnpm audit --audit-level=high`: no known vulnerabilities.
GitHub Advisory DB checked for typescript / tsdown / vitest high/critical: no open high/critical on the installed versions.

## Watching

| Train | Window | Source | Impact on this repo | Planned action | Status |
| --- | --- | --- | --- | --- | --- |
| TypeScript 7.0 (native / Go) | Shipped 2026-07-08; latest stable 7.0.2 | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ ; https://www.npmjs.com/package/typescript ; `npm view typescript dist-tags` | Compiler + tsdown dts (experimental `tsgo` path; warning: “TypeScript 7.0 does not yet have a stable API”) | Dedicated PR after 7.1 ships a stable API, or when tsdown dts is non-experimental. Tried 7.0.2 this run: typecheck/test/build passed, reverted because of the dts warning. | watching |
| TypeScript 7.1 | Beta 2026-09-09; RC 2026-10-20; **stable 2026-11-10** | https://github.com/microsoft/TypeScript/issues/63703 | Types / `lib` (`es2026`, iterator + Promise helpers, DOM). New (different) compiler API. | Soak 1–2 weeks after stable, then bump with tsdown. No source API we use is deprecated in 7.1 notes. | watching |
| TypeScript `@next` / nightlies | Continuous (`7.1.0-dev.*`) | `npm view typescript dist-tags` (`next`) | Types only if we opt in | Document only; do not bump | watching |
| Node 24 Active LTS (Krypton) | Active LTS since 2025-10-28; Maintenance **2026-10-20**; EOL 2028-04-30 | https://github.com/nodejs/Release ; https://nodejs.org/en/about/previous-releases | CI matrix | Added Node 24 to CI this run. Stay on Active LTS security patches. | done |
| Node 22 Maintenance LTS (Jod) | Maintenance since 2025-10-21; **EOL 2027-04-30** | https://github.com/nodejs/Release | CI oldest line | Keep until EOL policy. Drop only at 2027-04-30. | watching |
| Node 26 → Active LTS | Current now; **Active LTS 2026-10-28**; Maintenance 2027-10-20; EOL 2029-04-30 | https://github.com/nodejs/Release | CI matrix; `@types/node` already 26.x | Add to CI after Active LTS starts + short soak. Do not treat as required runtime yet. | watching |
| Node 24 → Maintenance | **2026-10-20** | https://github.com/nodejs/Release | CI still keeps 24 | Keep 24 through Maintenance; no drop. | watching |
| tsdown 0.23 | `0.23.0-rc.0` published 2026-08-12; stable date **TBD** | https://github.com/rolldown/tsdown/releases ; `npm view tsdown dist-tags` | `tsdown.config.ts`, dts generator, emit | Dedicated PR when stable. Config already uses native keys (`entry`, `format`, `dts`, `clean`, `outDir`, `fixedExtension`, `platform`) — no tsup-compat names to migrate. 0.23 removes those deprecated options and makes `dts.generator` the selector. | watching |
| vitest 5.0 | `5.0.0-rc.2` published 2026-08-17; milestone has no due date (**TBD**) | https://github.com/vitest-dev/vitest/releases ; https://github.com/vitest-dev/vitest/milestone/25 ; `npm view vitest dist-tags` | test runner / config | Dedicated PR when stable. Tests use `describe` / `it` / `expect` / `expectTypeOf` only — no `test.each` `$` titles, browser mode, or UI. No migrate-ahead needed. | watching |
| pnpm 11 | Latest 11.22.0 (major vs pinned 10.33.3) | https://pnpm.io/v/11.22.0 | `packageManager`, CI `pnpm/action-setup` version | Dedicated PR. Do not auto-merge. | watching |

## Landed (applied)

| Train | Applied version | Date | Notes |
| --- | --- | --- | --- |
| Node CI matrix | 22 + 24 | 2026-08-20 | Keep Maintenance LTS 22; add soaked Active LTS 24. |
| dep-update kit | skill + rule + schedule | 2026-08-20 | Playbook installed; this file is the first live lookup. |

## Run log

| Date | Agent | Bumped | Upcoming documented | Verify |
| --- | --- | --- | --- | --- |
| 2026-08-19 | seed | none (docs/skill created) | table seeded; next run must fetch live versions | n/a |
| 2026-08-20 | Cursor / Grok (dep-update) | CI Node 22 → matrix 22+24. No package version bumps (typescript 6.0.3 kept; tsdown 0.22.14 / vitest 4.1.11 / @types/node 26.2.0 already latest stable). Advisories: none on installed graph. | TypeScript 7.0 (shipped, deferred) + 7.1 (2026-11-10); Node 26 LTS 2026-10-28; Node 24 Maintenance 2026-10-20; tsdown 0.23-rc; vitest 5.0-rc; pnpm 11 | typecheck **pass**; test **pass** (12); build **pass**; exports vs `dist/` **pass**. TS 7.0.2 trial: typecheck/test/build pass, reverted (tsdown experimental-API warning). |
| 2026-08-20 | Cursor review follow-up | CI: add weekly schedule + `pnpm audit --audit-level=high` to match UPDATE-SCHEDULE Automation. | — | Bugbot: no bugs. Security: no medium+ findings; audit step added. |
