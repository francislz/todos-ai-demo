#!/usr/bin/env node
/**
 * Prints the Claude workflow state of the repo's open issues as JSON, so the scheduled tasks
 * decide from the same deterministic rules described in CLAUDE.md ("Claude workflow").
 *
 * Usage: node scripts/claude/board.mjs [--repo owner/name]
 * Needs `gh` with access to the repo (repo-scoped REST only; no GraphQL).
 */
import { execFileSync } from 'node:child_process';

const DEFAULT_REPO = 'francislz/todos-ai-demo';
/** Keep in sync with "Trusted people" in CLAUDE.md. */
const TRUSTED = (process.env.CLAUDE_TRUSTED ?? 'francislz')
  .split(',')
  .map((s) => s.trim().toLowerCase());
const CLAUDE_PREFIX = '🤖 Claude:';
const DESIGN_MARKER = /<!--\s*claude-design\s+(\{.*?\})\s*-->/s;
const APPROVED = /\bapproved\b/i;
const NOT_APPROVED = /\b(not|un|isn't|is not)\s*approved\b/i;

const LABELS = {
  claude: 'claude',
  awaitingAnswers: 'awaiting-answers',
  awaitingApproval: 'awaiting-approval',
  readyToImplement: 'ready-to-implement',
  implementing: 'implementing',
  inProgress: 'status:in-progress',
  inReview: 'status:in-review',
  blocked: 'status:blocked',
};
const WORKFLOW_LABELS = [
  LABELS.awaitingAnswers,
  LABELS.awaitingApproval,
  LABELS.readyToImplement,
  LABELS.implementing,
];
const PRIORITY_RANK = { 'priority:high': 0, 'priority:medium': 1, 'priority:low': 2 };
const PLANNING_LIMIT = 3;

const repoArgIndex = process.argv.indexOf('--repo');
const repo = repoArgIndex > -1 ? process.argv[repoArgIndex + 1] : DEFAULT_REPO;

function ghApi(path) {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 64 << 20 }));
}

function ghApiAll(path) {
  const results = [];
  for (let page = 1; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = ghApi(`${path}${sep}per_page=100&page=${page}`);
    results.push(...batch);
    if (batch.length < 100) return results;
  }
}

const isClaudeComment = (c) => c.body.trimStart().startsWith(CLAUDE_PREFIX);
const isTrusted = (c) => TRUSTED.includes(c.user.login.toLowerCase());

function describe(issue) {
  const labels = issue.labels.map((l) => l.name);
  const has = (name) => labels.includes(name);
  const priorityLabel = labels.find((l) => l in PRIORITY_RANK) ?? 'priority:medium';
  const base = {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    createdAt: issue.created_at,
    labels,
    assignees: issue.assignees.map((a) => a.login),
    priority: priorityLabel.replace('priority:', ''),
    priorityRank: PRIORITY_RANK[priorityLabel],
  };

  const comments = ghApiAll(`repos/${repo}/issues/${issue.number}/comments`);
  const claudeComments = comments.filter(isClaudeComment);
  const humanTrusted = comments.filter((c) => !isClaudeComment(c) && isTrusted(c));

  let design = null;
  let designPublishedAt = null;
  for (const c of claudeComments) {
    const match = c.body.match(DESIGN_MARKER);
    if (!match) continue;
    try {
      design = JSON.parse(match[1]);
      designPublishedAt = c.created_at;
    } catch {
      /* ignore malformed marker */
    }
  }

  const approvalComment =
    designPublishedAt &&
    humanTrusted
      .filter((c) => c.created_at > designPublishedAt)
      .filter((c) => APPROVED.test(c.body) && !NOT_APPROVED.test(c.body))
      .at(-1);
  const approval = approvalComment
    ? {
        login: approvalComment.user.login,
        at: approvalComment.created_at,
        notes: approvalComment.body,
        version: design?.version ?? null,
        versionId: design?.versionId ?? null,
      }
    : null;

  const lastClaudeAt = claudeComments.at(-1)?.created_at ?? null;
  const answeredAfterQuestions =
    has(LABELS.awaitingAnswers) &&
    humanTrusted.some((c) => !lastClaudeAt || c.created_at > lastClaudeAt);

  let phase = 'todo';
  if (has(LABELS.blocked)) phase = 'blocked';
  else if (has(LABELS.inReview)) phase = 'in-review';
  else if (has(LABELS.implementing)) phase = 'implementing';
  else if (has(LABELS.readyToImplement)) phase = 'ready-to-implement';
  else if (has(LABELS.awaitingApproval)) phase = approval ? 'approved' : 'awaiting-approval';
  else if (has(LABELS.awaitingAnswers))
    phase = answeredAfterQuestions ? 'answered' : 'awaiting-answers';
  else if (has(LABELS.inProgress)) phase = 'analysis-in-progress';

  return {
    ...base,
    phase,
    design,
    designPublishedAt,
    approval,
    lastClaudeCommentAt: lastClaudeAt,
    isCandidate:
      has(LABELS.claude) &&
      base.assignees.length === 0 &&
      !labels.some((l) => l.startsWith('status:')) &&
      !labels.some((l) => WORKFLOW_LABELS.includes(l)),
  };
}

const byPriorityThenAge = (a, b) =>
  a.priorityRank - b.priorityRank || a.createdAt.localeCompare(b.createdAt);

const openIssues = ghApiAll(`repos/${repo}/issues?state=open`).filter((i) => !i.pull_request);
const relevant = openIssues.filter((i) =>
  i.labels.some(
    (l) =>
      l.name === LABELS.claude || l.name.startsWith('status:') || WORKFLOW_LABELS.includes(l.name),
  ),
);
const issues = relevant.map(describe).sort(byPriorityThenAge);

const planningPhases = [
  'analysis-in-progress',
  'awaiting-answers',
  'answered',
  'awaiting-approval',
  'approved',
];
const planningHeld = issues.filter((i) => planningPhases.includes(i.phase)).length;

const summary = {
  repo,
  generatedAt: new Date().toISOString(),
  trusted: TRUSTED,
  planning: {
    held: planningHeld,
    limit: PLANNING_LIMIT,
    roomForNew: Math.max(0, PLANNING_LIMIT - planningHeld),
    interrupted: issues.filter((i) => i.phase === 'analysis-in-progress').map((i) => i.number),
    awaitingApproval: issues.filter((i) => i.phase === 'awaiting-approval').map((i) => i.number),
    answered: issues.filter((i) => i.phase === 'answered').map((i) => i.number),
  },
  candidates: issues.filter((i) => i.isCandidate).map((i) => i.number),
  implementing: issues.filter((i) => i.phase === 'implementing').map((i) => i.number),
  readyToImplement: issues
    .filter((i) => i.phase === 'approved' || i.phase === 'ready-to-implement')
    .map((i) => i.number),
  issues,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
