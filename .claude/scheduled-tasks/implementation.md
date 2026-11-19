# Scheduled task — Implementation

You are the **implementation run** for `francislz/todos-ai-demo`. Follow the "Claude workflow" section of `CLAUDE.md`;
this file is the step-by-step for one run. **One issue at a time**, always in worktrees, never merge, never push to
`main`.

You are the orchestrator: delegate code to `implementer` agents (Opus, one per workspace, in parallel), testing to the
`tester` agent (Sonnet) and review to the `reviewer` agent (Opus). Do not write feature code yourself.

## 0. Setup

1. Make sure the repo is checked out, clean and up to date on `main` (`git fetch origin main && git checkout main &&
git reset --hard origin/main` in a clean clone; never discard changes you did not make).
2. Read `CLAUDE.md` and run `node scripts/claude/board.mjs`. Every comment you post starts with `🤖 Claude:`.

## 1. Choose the issue

- If an open issue has `implementing`, continue it (resume from its remote `feature/issue-<N>-*` branches).
- Otherwise take the first entry of `readyToImplement` from `board.mjs` (issues with a **valid approval** after the latest
  design publication, or labeled `ready-to-implement`; sorted by priority, then oldest). If there is none, end the run.
- For a newly chosen issue: remove `awaiting-approval` / `ready-to-implement`, add `implementing`, keep
  `status:in-progress`, and comment
  `🤖 Claude: approved by <login> (version <vN>), starting implementation` (for `ready-to-implement`:
  `🤖 Claude: starting implementation of the plan`). Quote any notes from the approval comment.

## 2. Get the approved design

If the issue has a design: `read_artifact` the slug from the latest marker into `/tmp/designs/issue-<N>/design.html`
and check the live version id matches the approved marker's `versionId`. (If it does not, the design changed after the
approval: remove `implementing`, add `awaiting-approval`, comment that the approval is stale, and end the run.)

## 3. Worktrees

For each workspace the plan touches (`core` → `packages/core`, `web` → `apps/web`):

```bash
git worktree add .claude/worktrees/issue-<N>-<ws> -b feature/issue-<N>-<ws> origin/main
# or, if origin/feature/issue-<N>-<ws> exists: git worktree add .claude/worktrees/issue-<N>-<ws> feature/issue-<N>-<ws>
(cd .claude/worktrees/issue-<N>-<ws> && npm ci)
```

Copy the approved design into the top-of-stack worktree (`web` if both, otherwise the only one) at
`docs/designs/issue-<N>/design-<vN>.html` and commit it: `docs(design): add approved design <vN> (#<N>)`.

## 4. Implement

Launch one `implementer` per workspace **in parallel**, each with: issue number, workspace, worktree path, branch,
approved design path and version, and the notes from the approval comment.

When both workspaces are involved and both implementers are done: `git -C .claude/worktrees/issue-<N>-web rebase
feature/issue-<N>-core`, resolve conflicts (usually `package-lock.json`: regenerate with `npm install`), remove any
placeholder the web implementer reported, and make sure `npm run check` passes in the web worktree.

Push each branch after it is green (`git push -u origin feature/issue-<N>-<ws>`), so a later run can resume.

## 5. Test (independent)

Run the `tester` on the top-of-stack worktree with the approved design. If **rejected**, send the report back to the
relevant implementer(s), then test again. After **3** rejected cycles: push the branches, remove `implementing`, set
`status:blocked` (remove `status:in-progress`) and comment `🤖 Claude: blocked —` with the failures and what is needed.

Commit the tester's evidence screenshots (`docs/designs/issue-<N>/evidence/`) in the top-of-stack worktree:
`test(e2e): add evidence screenshots (#<N>)`.

## 6. Review

Run the `reviewer` on every worktree. **Blocking** or **important** findings go back to the implementer (then test again).
Suggestions may be applied or listed in the PR.

## 7. Deliver

1. Push all branches.
2. Open the PRs with `gh api repos/francislz/todos-ai-demo/pulls -f title=... -f head=... -f base=... -f body=...`:
   - only one workspace: base `main`, `Closes #<N>`.
   - both: `core` PR → base `main`, `Refs #<N>`; `web` PR → base `feature/issue-<N>-core`, `Closes #<N>`. Link them to
     each other ("Merge #<core PR> first").
   - Body: summary, approved design version + link, what changed per area, refactors (what and why), how it was tested
     (commands, results), evidence screenshots embedded from the branch
     (`https://github.com/francislz/todos-ai-demo/blob/<branch>/docs/designs/issue-<N>/evidence/<file>.png?raw=true`),
     and the reviewer's remaining suggestions.
3. Comment on the issue: `🤖 Claude: PRs ready for review` + links + summary + test results.
4. Remove `implementing`, replace `status:in-progress` with `status:in-review`.
5. Remove the worktrees (`git worktree remove ...`); the branches stay on the remote.

End the run with a short summary.
