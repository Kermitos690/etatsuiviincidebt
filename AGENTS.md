# Cost-aware development rules

These rules are mandatory for every agent and contributor working in this repository.

## Default workflow

- Start feature work in a **draft pull request**.
- Batch related changes before pushing; never create empty, `WIP`, `Changes`, or trigger-only commits.
- Do not introduce GitHub Actions automatically unless a real validation gap requires it.
- Never add automatic `push` triggers for feature, `agent/**`, or integration branches.
- Any future PR workflow must skip draft PRs, use narrow path filters, and set `concurrency` with `cancel-in-progress: true`.

## CI and deployment design

- Prefer targeted local/Lovable validation while the project has no required GitHub-hosted CI.
- If CI is added, run cheap fail-fast checks before database, browser, build, or deployment work.
- Do not use `continue-on-error` for required checks.
- Use caches and deterministic installs such as `npm ci --no-audit --no-fund --prefer-offline`.
- Upload artifacts only on failure and retain them briefly.
- Gmail OAuth changes, Supabase migrations, Edge Function deployments, administrative-data processing, and production operations must remain manual and explicitly confirmed.

## Scheduled and one-shot automation

- Prefer Supabase cron or the hosting platform's job system over GitHub runners.
- Document expected monthly runs before adding any schedule and use the lowest useful frequency.
- Do not create self-modifying or one-shot workflows that commit and push code.

## Change control

- Do not add or broaden automation without documenting its cost impact.
- Avoid overlapping deployment systems for the same change.
- Close or retire obsolete branches and one-shot functions.
- Re-run only the failed targeted operation, never an entire successful process.
