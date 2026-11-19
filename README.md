# todos-ai-demo

A deliberately tiny TODO app (create, complete, delete) used to demo an **AI-assisted delivery workflow**:

> GitHub issue → Claude plans it (investigation + design artifact) → a human approves → Claude implements, tests,
> reviews and opens the PRs → a human merges.

The app is the excuse; the workflow is the point. Every rule lives in [`CLAUDE.md`](./CLAUDE.md).

## The app

```bash
npm ci
npm run dev        # http://localhost:3000
npm run check      # lint, format, typecheck, unit tests, build
npm run test:e2e   # Playwright (desktop + mobile)
```

| Workspace       | What                                                            |
| --------------- | --------------------------------------------------------------- |
| `packages/core` | Domain: `Todo`, validation, `TodoService`, JSON-file repository |
| `apps/web`      | Next.js 16 + React 19: UI and `/api/todos` route handlers       |

## The workflow

| Piece                 | Where                                                        | Model  |
| --------------------- | ------------------------------------------------------------ | ------ |
| Investigation         | `.claude/agents/investigator.md`                             | Sonnet |
| Design + mockups      | `.claude/agents/architect.md` → published as Claude artifact | Fable  |
| Implementation        | `.claude/agents/implementer.md` (one per workspace)          | Opus   |
| Testing (independent) | `.claude/agents/tester.md`                                   | Sonnet |
| Code review           | `.claude/agents/reviewer.md`                                 | Opus   |
| Planning run          | `.claude/scheduled-tasks/planning.md` (scheduled task)       | —      |
| Implementation run    | `.claude/scheduled-tasks/implementation.md` (scheduled task) | —      |
| Board state (helper)  | `node scripts/claude/board.mjs`                              | —      |
| Board column sync     | `.github/workflows/project-status-sync.yml`                  | —      |

Issue labels drive everything: `claude` (pick me) → `status:in-progress` → `awaiting-approval` (design published) →
human comments **approved** → `implementing` → PRs + `status:in-review` → human merges (Done).

See [`docs/DEMO.md`](./docs/DEMO.md) for the step-by-step demo script.
