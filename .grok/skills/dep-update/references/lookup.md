# Lookup sources (current + upcoming)

Use these sources on every run. Record the **date checked** in `docs/RELEASES-UPCOMING.md`.

## Current versions

| What | Where |
| --- | --- |
| Installed vs latest | `pnpm outdated` |
| Advisories | `pnpm audit --audit-level=high`; [GitHub Advisories](https://github.com/advisories) |
| npm latest | `npm view <pkg> version` and `npm view <pkg> dist-tags` |
| TypeScript stable | [TypeScript releases](https://github.com/microsoft/TypeScript/releases); npm `typescript` |
| Node LTS now | [nodejs.org/status](https://nodejs.org/en) and [Release schedule](https://github.com/nodejs/release#release-schedule) |
| tsdown | [tsdown.dev](https://tsdown.dev); GitHub releases for the tsdown repo |
| vitest | [vitest.dev](https://vitest.dev); GitHub `vitest-dev/vitest` releases |
| @types/node | npm `@types/node` — pin to the **oldest supported Node major** |

## Upcoming / future versions

| What | Where to look |
| --- | --- |
| TypeScript next iteration | [TypeScript roadmap](https://github.com/microsoft/TypeScript/wiki/Roadmap); iteration plans; `typescript@next` / `@rc` dist-tags; TS GitHub milestones |
| TypeScript breaking themes | Release notes of the **next** RC; issues labeled Breaking Change |
| Node next LTS / EOL | [Node release calendar](https://nodejs.org/en/about/previous-releases); [nodejs.org calendar](https://github.com/nodejs/Release) |
| tsdown next | GitHub releases + CHANGELOG + `breaking` issues; Rolldown notes if tsdown tracks it |
| vitest next major | Vitest GitHub milestone / discussions / `vitest@beta` |
| Ecosystem soak | TypeScript “what's new” blog; DefinitelyTyped breakage reports ~1–2 weeks after a TS minor |

## Search queries (copy)

```
TypeScript roadmap <year>
TypeScript <next-minor> iteration plan
Node.js LTS schedule
tsdown changelog breaking
vitest next major
npm view typescript dist-tags
GitHub advisory typescript OR tsdown OR vitest
```

## What to write down

For every tool: `installed`, `latest stable`, `dist-tags (next/rc/beta)`, `next dated event`, `source URL`, `action`.
