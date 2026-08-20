# Update schedule

Policy for `@danrabydev/match` (reusable for other small TypeScript libraries).
**Agents:** follow `.grok/skills/dep-update/SKILL.md` when this schedule is the task.

## Risk model

| Surface | Risk | Why |
| --- | --- | --- |
| Runtime code | Very low | Zero third-party runtime dependencies |
| Dev / toolchain | Medium | TypeScript, tsdown, vitest, pnpm, Node, `@types/node` |
| Publish | Medium | Compromised account or malicious **build-graph** dependency |

Security work is almost entirely **advisories + lockfile + compiler**, not runtime patches.

## Cadence

| Category | Frequency | Trigger | Action |
| --- | --- | --- | --- |
| Security advisories (npm, GitHub) | Continuous | Any high/critical advisory on direct or transitive deps | Investigate within 48h; patch or justify |
| TypeScript | Follow stable releases | New TS minor/major after 1–2 weeks of community soak | Bump; run full typecheck + tests; fix source if needed |
| Build tool (tsdown) | Monthly or on major | Security fix or breaking change that affects us | Bump + verify `dist/` |
| Test runner (vitest) | Monthly | Security or useful fixes | Bump + re-run suite |
| Node.js | LTS only | Active LTS security releases; new LTS | Update CI matrix; document EOL |
| Routine refresh | Quarterly | No open high/critical vulns | `pnpm update` + full verification |
| Major version bumps | As needed | Value clearly exceeds cost | Dedicated PR with notes |

## Process for every update

1. Create branch `deps/<scope>-<version>` or `chore/deps-YYYY-MM`.
2. Look up **current** and **upcoming** versions (skill §2–3). Do not bump blindly.
3. Apply only what cadence says is due. Migrate deprecated APIs **ahead** of future majors.
4. Run: `pnpm typecheck && pnpm test && pnpm build`.
5. Spot-check generated `dist/` and package `exports`.
6. Update `docs/RELEASES-UPCOMING.md` (near-future trains + run log).
7. Open PR with: bumps, advisories, upcoming items, command results.

## Automation

- Dependabot or Renovate:
  - Grouped minor/patch for `devDependencies`
  - Separate PRs for security
  - Ignore docs-only / unused test-utils
- CI on schedule (weekly) and on PR:
  - `pnpm audit --audit-level=high`
  - typecheck + test + build
- Optional: monthly `pnpm outdated` comment or issue

## Non-goals

- Do not chase TypeScript nightlies or betas (document them; do not ship them).
- Do not auto-merge majors.
- Do not add runtime dependencies without a strong reason.

## Review calendar

- **Weekly:** glance at open security alerts; refresh upcoming dates if announced.
- **Monthly:** toolchain health (tsdown, vitest, types).
- **Quarterly:** deliberate refresh + Node LTS alignment.
- **On every TS stable release:** evaluate bump after 1–2 week soak.

## Maintenance posture (README one-liner)

Zero runtime dependencies. Toolchain updates follow this file and the `dep-update` skill.
