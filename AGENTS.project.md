# Project agent entry (Grok + Cursor)

This repo’s **maintenance / dependency-update** work is skill-driven.

## When the task is an update

If the user or scheduler says update, deps, security, TypeScript bump, Node LTS, upcoming releases, or “run the update schedule”:

1. Load **`.grok/skills/dep-update/SKILL.md`** (Grok skill and Cursor playbook).
2. Follow it in order: inventory → current versions → **upcoming versions** → apply due bumps + code fixes → write **`docs/RELEASES-UPCOMING.md`**.
3. Obey **`docs/UPDATE-SCHEDULE.md`**.

Cursor also has **`.cursor/rules/dep-update.mdc`** (same policy, description-triggered).

Do not invent a second process. Do not bump without looking up future trains. Do not leave upcoming releases undocumented.
