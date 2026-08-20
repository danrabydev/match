# Upcoming releases

Living log for **near-future** TypeScript, Node, and toolchain trains.
Updated by the `dep-update` skill on every maintenance task.

Agents must **look up** current sources (see `.grok/skills/dep-update/references/lookup.md`)
and replace the rows below. Do not leave this file with an old “Last checked” date.

**Last checked:** 2026-08-19 (seed — next run must refresh all rows from the network)

## Watching

| Train | Window | Source | Impact on this repo | Planned action | Status |
| --- | --- | --- | --- | --- | --- |
| TypeScript next stable after installed | TBD — check roadmap | https://github.com/microsoft/TypeScript/wiki/Roadmap | Compiler + `tsconfig` | Soak 1–2 weeks after stable, then bump | watching |
| TypeScript RC / `@next` | TBD | `npm view typescript dist-tags` | Types only if we opt in | Document only; do not bump | watching |
| Node Active LTS (current) | See nodejs.org calendar | https://github.com/nodejs/Release | CI `engines` | Stay on Active LTS; security patches ASAP | watching |
| Next Node LTS | TBD | same | CI matrix | Add after Active LTS starts; do not drop previous until policy | watching |
| tsdown next major | TBD | tsdown GitHub releases / CHANGELOG | `tsdown.config.ts`, emit | Migrate config keys ahead; dedicated PR for major | watching |
| vitest next major | TBD | https://github.com/vitest-dev/vitest/releases | test config | Dedicated PR | watching |

## Landed (applied)

| Train | Applied version | Date | Notes |
| --- | --- | --- | --- |
| — | — | — | Fill when a bump ships |

## Run log

| Date | Agent | Bumped | Upcoming documented | Verify |
| --- | --- | --- | --- | --- |
| 2026-08-19 | seed | none (docs/skill created) | table seeded; next run must fetch live versions | n/a |
