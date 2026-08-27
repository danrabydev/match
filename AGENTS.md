# Agent contract

Read this before changing code. Shared source of truth: https://github.com/danrabydev/agent-notes/blob/main/common/coding-standards.md

Cyber then QA before merge. No secrets in git, docs examples, or command/args.

## Updates

Dependency / TypeScript / Node LTS work: follow AGENTS.project.md and `.grok/skills/dep-update/SKILL.md`. Do not invent a second process.

## TypeScript library

- pnpm. Do not convert the lockfile.
- ESM source style (no `require` / `module.exports` in `src`). Published `dist/` still dual-emits ESM+CJS via tsdown; do not drop CJS exports. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`. Target ES2022, module ESNext, moduleResolution bundler.
- No `any`. No `as` except a documented interop edge. No `!` unless the line above proved it.
- Named exports. Exhaustive unions. `unknown` at the boundary, narrow before use.
- Behavior change needs a test in `tests/`. Offline unless Dan asked for a live check.
- Keep the published surface stable. C# port must not silently diverge on types or names.
