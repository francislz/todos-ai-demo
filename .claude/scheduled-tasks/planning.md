# Scheduled task — Planning

You are the **planning run** for `francislz/todos-ai-demo`. Follow the "Claude workflow" section of `CLAUDE.md`; this file
is the step-by-step for one run. Planning **never changes code** and never pushes branches.

You are the orchestrator: delegate investigation to `investigator` agents (Sonnet) and design to the `architect` agent
(Fable). Do not investigate or design yourself beyond reading their reports.

## 0. Setup

1. Make sure the repo is checked out and up to date on `main` (`git fetch origin main && git checkout main &&
git reset --hard origin/main` in a clean clone; never discard local changes you did not make).
2. Read `CLAUDE.md`.
3. Get the board state: `node scripts/claude/board.mjs` (JSON: open issues with labels, assignees, priority, workflow
   state, latest design marker and approval). GitHub access is repo-scoped REST through `gh api` (or GitHub MCP tools
   when present). Every comment you post starts with `🤖 Claude:`.

## 1. Housekeeping on issues Claude already holds (in this order)

a. **Interrupted analyses** — issues with `status:in-progress` and **no** workflow label (`awaiting-*`,
`ready-to-implement`, `implementing`): an earlier run stopped mid-analysis. If the latest `🤖 Claude:` comment is less
than 25 minutes old, skip it (another run may be on it). Otherwise comment `🤖 Claude: resuming the analysis` and
continue it from step 3.

b. **`awaiting-approval` with artifact feedback** — for each, read the artifact comments (`read_comments` with the slug
from the design marker). Unresolved threads from trusted people that are newer than the current version are change
requests:

1.  `read_artifact` the live page into `/tmp/designs/issue-<N>/design.html`.
2.  Run the `architect` with the issue, the comments to address and that file. It edits the file and bumps the version.
3.  Republish to the **same artifact** (`publish_files` with `slug` and `base_version` = live version, label
    `vN — <summary>`).
4.  Reply in each `@claude` thread with what changed and resolve it. Threads without `@claude` stay open.
5.  Comment on the issue: `🤖 Claude: design updated to vN — <what changed>` + link + new marker. This makes earlier
    approvals stale: approval must come after the latest publication.

c. **`awaiting-answers` that were answered** — a trusted person commented after Claude's questions. Remove
`awaiting-answers`, comment `🤖 Claude: thanks, resuming the analysis`, and continue from step 3 with the answers.

## 2. Pick a new issue (only if there is room)

Count issues Claude holds in planning: `status:in-progress` without `implementing`/`ready-to-implement`, plus
`awaiting-answers`, plus `awaiting-approval`. Blocked issues (`status:blocked`) do not count. If the count is **< 3**,
pick the next candidate from `board.mjs` (`candidates`, already sorted: open, label `claude`, no assignees, no `status:*`
and no workflow label; priority high → low, then oldest). If none, skip to step 5.

Set `status:in-progress` and comment `🤖 Claude: started the analysis`.

## 3. Analyze

Launch `investigator` agents **in parallel**: one per workspace involved (`packages/core`, `apps/web`) and one per open
question. Give each the issue title/body/trusted comments and a precise question.

If something about scope or business rules is unclear: comment a **numbered** list of questions
(`🤖 Claude: a few questions before I design this — ...`), add `awaiting-answers`, and go back to step 2 for another
issue.

## 4. Design or plan

- **Needs design** (new/changed screen, API contract, data model, or both workspaces): run the `architect` with the issue
  and the investigator reports. Then publish `/tmp/designs/issue-<N>/design.html` as a **new** artifact
  (`publish_files`, title `#<N> <short title> — design`, icon `blueprint`, label `v1`). Comment on the issue:

  ```
  🤖 Claude: the design is ready for review — **v1**

  <artifact link>

  <10–15 line summary from the architect: contract, data model, screens, plan per workspace, refactors, open decisions>

  **How to review:** comment on the artifact mentioning `@claude` to request changes; reply **approved** here to approve
  (you can add notes in the same comment).

  <!-- claude-design {"slug":"<slug>","url":"<url>","version":"v1","versionId":"<version id>"} -->
  ```

  Add `awaiting-approval`.

- **Simple** (no UI, contract or data model change, one workspace): comment the plan
  (`🤖 Claude: plan — ...`, files, tests) and add `ready-to-implement`.

Then go back to step 2 while there is room.

## 5. Finish

Post nothing else. End the run with a short summary (issues touched, what changed, what is waiting on humans).
