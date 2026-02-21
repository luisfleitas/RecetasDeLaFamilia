---
name: github-branching-pr-flow-solo-dev
description: Enforce a solo-developer GitHub branching and pull-request flow with `main` as production, `pre-main` as staging, and `feature/<kebab-case-name>` as the only working branch type. Use when planning, implementing, fixing, or releasing code changes in a repository and when the user needs strict guardrails for branch creation, commit discipline, PR sequencing, staging verification, and release readiness.
---

# GitHub Branching Strategy + PR Flow (Solo Dev)

Apply this workflow for every code change.

## Branch Model

- Treat `main` as production-ready code.
- Treat `pre-main` as staging/release-candidate code.
- Create all work on `feature/<kebab-case-name>`.
- Never commit directly to `main` or `pre-main`.
- Never merge to `main` before merging to `pre-main`.

## Workflow

1. Check branch state before coding.
2. Create `pre-main` from `main` if `pre-main` does not exist.
3. Create a feature branch from `pre-main` for the requested scope.
4. Implement only the requested change (MVP-first).
5. Keep the app runnable after meaningful steps.
6. Add or update tests when the repo already uses tests.
7. Commit in small logical units with clear messages.
8. Prefer Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`.
9. Open PR #1 from `feature/<name>` to `pre-main`.
10. Include in PR #1: change summary, rationale, test steps, risks, rollback notes.
11. Ensure CI passes, or explain missing CI with the minimal proposal.
12. Resolve conflicts on the feature branch only.
13. Define a short staging verification checklist for `pre-main`.
14. Fix staging bugs on the same feature branch when practical.
15. Open PR #2 from `pre-main` to `main` after staging validation.
16. Summarize release scope and confirm production readiness in PR #2.
17. Tag a release after merge if the repository uses tags.

## Required Final Output Format

When work is complete, report:

1. Branch used
2. Commits made
3. PRs opened (`from -> to`)
4. How to test
5. Release notes for `pre-main -> main`
