# Cadence (when to bump vs document)

Aligned with `docs/UPDATE-SCHEDULE.md`. This file is the **decision table** the skill executes.

## Package posture (@danrabydev/match)

- Runtime dependencies: **none**. Vuln surface is toolchain + publish graph.
- Dev/toolchain: `typescript`, `tsdown`, `vitest`, `@types/node`, pnpm, Node.
- Risk of delay: low for minors; high for **security advisories** and **compiler breaks**.

## Calendar

| Slot | Frequency | Agent must |
| --- | --- | --- |
| Security | Continuous / on task | Audit + GH advisories; patch high/critical within 48h |
| Glance | Weekly | Advisories + `pnpm outdated`; document new upcoming dates |
| Tooling | Monthly | tsdown, vitest, @types/node patches/minors if tests pass |
| TypeScript | Each stable release + 1–2 week soak | Bump TS; fix `src/` if needed |
| Node | LTS events | CI on Active LTS; drop only at Maintenance/EOL per schedule |
| Refresh | Quarterly | `pnpm update` in range; re-verify; rewrite RELEASES-UPCOMING |

## Apply vs document

| Release class | Apply in this task? | Document upcoming? |
| --- | --- | --- |
| Security patch (high/critical) | Yes | Yes if more CVEs pending |
| Patch / minor (toolchain) | Yes if monthly slot or user asked | If a major is also announced |
| TypeScript stable (soaked) | Yes | Next iteration |
| TypeScript RC / nightly | No (unless user asked) | Yes |
| Node new major (not LTS yet) | No | Yes; wait for Active LTS |
| Node new Active LTS | CI add after short soak | EOL of previous |
| Major of tsdown/vitest | Dedicated PR only | Yes from first announcement |
| Deprecation with replacement | Migrate **code now**, bump later | Yes (`migrated-ahead`) |

## Code updates (not just versions)

When a current **or upcoming** release changes:

- `tsconfig` (`target`, `lib`, `moduleResolution`, `verbatimModuleSyntax`)
- `tsdown.config.ts` option names
- vitest config (`vitest.config.ts`)
- Node APIs / `@types/node` globals
- `engines` in `package.json`
- README install/engine text

…edit those files in the same change set as the bump (or ahead of the bump if still documenting).

## Do not

- Auto-merge majors
- Follow TypeScript nightlies
- Add runtime deps
- Leave `docs/RELEASES-UPCOMING.md` without a check date
