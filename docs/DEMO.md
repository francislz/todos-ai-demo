# Demo script

## One-time setup (≈5 min)

1. **Project board** — github.com → your profile → Projects → New project → **Board**. Name it `todos-ai-demo`.
   - Edit the **Status** field so its options are exactly: `Todo`, `In Progress`, `In Review`, `Done`, `Blocked`.
   - Link it to the repo (repo → Projects tab → Link a project).
   - Optional: in the project's Workflows, turn on "Auto-add to project" for `repo:francislz/todos-ai-demo is:issue`.
2. **Board sync token** — create a classic PAT with the `project` scope (add `repo` if the repo is private).
   Repo → Settings → Secrets and variables → Actions:
   - Secret `PROJECT_TOKEN` = the PAT.
   - Variable `PROJECT_NUMBER` = the number at the end of the Project URL (`.../projects/<number>`).
     Without these the workflow just skips; labels still drive everything.
3. **Artifact access** — the design artifacts are private to your account; nothing to set up.

## Live demo

1. **Create the card** — new issue (Feature template), e.g.:

   > **Labels for todos**
   > What: let users add labels to a todo (e.g. `work`, `home`) and filter the list by label.
   > Acceptance criteria: add/remove labels when creating or editing a todo; labels shown as chips;
   > filter by one label; filter survives a page reload; existing todos keep working.

   It appears on the board in **Todo**.

2. **Hand it to Claude** — add the `claude` label (optionally `priority:high`).
3. **Run planning** — claude.ai → Scheduled tasks → `todos-ai-demo · Planning` → **Run now**. Watch:
   - card → **In Progress**, comment `🤖 Claude: started the analysis`;
   - Sonnet investigators in parallel, then Fable architect;
   - a design **artifact** (contract, data model, mockups, test plan) linked in a comment; label `awaiting-approval`.
   - Optional: comment on the artifact with `@claude make the chips smaller` and run planning again → v2.
4. **Approve** — comment `approved` on the issue (you can add notes, e.g. `approved — max 5 labels per todo`).
5. **Run implementation** — `todos-ai-demo · Implementation` → **Run now**. Watch:
   - `implementing` label, comment `🤖 Claude: approved by francislz (version v1), starting implementation`;
   - Opus implementers in parallel (`core` and `web` worktrees), Sonnet tester (Playwright desktop + mobile,
     screenshots vs. mockups), Opus reviewer;
   - two stacked PRs (`core` → `main`, `web` → `core`) with evidence, CI running; card → **In Review**.
6. **Merge** core, then web → issue closes → card → **Done**.

## Timing and fallbacks

- Planning takes roughly 5–15 min, implementation 20–40 min. Consider kicking off implementation before the
  talk's Q&A, or have a pre-recorded run ready.
- If a run stalls, open its session from Scheduled tasks to see what it is doing.
- Board not moving? Check the "Project status sync" workflow run on the issue's events (missing secret/variable or a
  missing Status option are logged there).
- After the demo, give the tasks a schedule (planning every 30 min, implementation every 20 min) to make it autonomous.
