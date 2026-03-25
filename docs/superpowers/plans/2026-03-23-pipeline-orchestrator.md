# Pipeline Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `/pipeline` skill that orchestrates the full development workflow from brainstorm to PR, with batch parallel execution support.

**Architecture:** Single project-scoped skill (SKILL.md) that instructs Claude to follow a 7-phase pipeline, manage state via JSON, and auto-invoke relevant skills per phase. Supporting config changes in .gitignore and CLAUDE.md.

**Tech Stack:** Claude Code skills (Markdown), JSON state files

**Spec:** `docs/superpowers/specs/2026-03-23-pipeline-orchestrator-design.md`

---

### Task 1: Create Pipeline Skill Directory and SKILL.md

**Files:**
- Create: `.claude/skills/pipeline/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p /home/zet/Project/sinaloka/.claude/skills/pipeline
```

- [ ] **Step 2: Write SKILL.md**

Create `.claude/skills/pipeline/SKILL.md` with the following content:

````markdown
---
name: pipeline
description: Use when the user wants to run a full development workflow from brainstorm to PR. Single entry point that orchestrates all skills automatically. Trigger on "/pipeline", "run pipeline", "full workflow", "automate", "end-to-end", "orchestrate", or when user provides task descriptions to implement end-to-end. Also handles resume of interrupted pipelines.
---

# Pipeline Orchestrator

Single entry point for the full development workflow. Orchestrates all skills from brainstorm to merged PR.

> **Nature:** This is guided orchestration, not an enforced state machine. Follow these instructions best-effort. State tracking via `active.json` aids resume but is not mechanical enforcement. Deviate when context demands it.

## Required Skills

All skills referenced in this pipeline already exist:

| Skill | Source |
|---|---|
| `superpowers:brainstorming` | superpowers plugin |
| `superpowers:writing-plans` | superpowers plugin |
| `superpowers:using-git-worktrees` | superpowers plugin |
| `superpowers:subagent-driven-development` | superpowers plugin |
| `superpowers:executing-plans` | superpowers plugin |
| `superpowers:requesting-code-review` | superpowers plugin |
| `superpowers:finishing-a-development-branch` | superpowers plugin |
| `superpowers:systematic-debugging` | superpowers plugin |
| `superpowers:test-driven-development` | superpowers plugin (embedded in plan TDD steps) |
| `parallel-tmux-agents` | user-global skill |
| `nestjs-expert` | user-global skill |
| `frontend-design:frontend-design` | official plugin |
| `performance` | user-global skill |
| `conflict-detect` | project skill |

## Quick Start

```
# Single task
/pipeline add refund feature for payment module

# Batch (2+ tasks)
/pipeline
- add refund feature for payment module
- redesign student enrollment page
- fix attendance notification bug

# Resume interrupted pipeline
/pipeline
```

## On Invocation

### 1. Check for Active Pipeline

Read `docs/superpowers/pipeline/active.json`. If it exists:

```
Pipeline aktif ditemukan:
- Mode: [single/batch] ([N] tasks)
- Progress: [summary of current state]
- Next: [what will happen next]

Lanjutkan? (y/n)
```

If user says yes → resume from last saved state.
If user says no → ask if they want to abandon (moves active.json to history/) or keep it for later.

### 2. Parse Input

- 1 task description → **single mode**
- 2+ task descriptions (bullet list or newline-separated) → **batch mode**

### 3. Initialize State

Create `docs/superpowers/pipeline/active.json`:

```json
{
  "version": 1,
  "mode": "single|batch",
  "created_at": "ISO-8601",
  "tasks": [
    {
      "id": "A",
      "description": "task description",
      "phase": "brainstorm",
      "wave": null,
      "spec": null,
      "plan": null,
      "worktree": null,
      "branch": null,
      "status": "pending"
    }
  ],
  "waves": [],
  "checkpoint_pending": null
}
```

Task status values: `pending`, `in_progress`, `done`, `failed`, `paused`
Wave status values: `pending`, `in_progress`, `done`

## Pipeline Phases

Execute phases in order. Update `active.json` after each phase transition.

### Phase 1: Brainstorm (sequential, per task)

For each task:

1. Update task status to `in_progress`, phase to `brainstorm`
2. **Auto-detect domain skills:**
   - Task mentions "backend", "API", "endpoint", "database", or `sinaloka-backend/` → note for Phase 5: use `nestjs-expert`
   - Task mentions "UI", "page", "component", "frontend", or any frontend app dir → invoke `frontend-design` skill during brainstorm
   - Task mentions "landing" or `sinaloka-landing/` → invoke `frontend-design`
   - Task mentions "optimize", "speed", "performance" → note for Phase 5: use `performance`
3. Invoke `superpowers:brainstorming` skill
4. If UI task detected → also invoke `frontend-design:frontend-design` during brainstorm
5. Follow brainstorming flow → present design

**CHECKPOINT: Design Approval**
- Set `checkpoint_pending: "design_approval"` in active.json
- Present the design and ask: **"Approve design? (y/n)"**
- If rejected → re-brainstorm with user feedback
- If approved → set `checkpoint_pending: null`, continue

6. Write spec doc, run spec review loop (dispatch spec-document-reviewer subagent)
7. Update task: `spec` field with spec path, phase to `plan`

**Repeat for each task sequentially** — user must approve each design.

### Phase 2: Plan (parallelizable in batch mode)

For each task:

1. Update task status to `in_progress`, phase to `plan`
2. Invoke `superpowers:writing-plans` skill
3. **IMPORTANT:** Ensure the plan ends with `## Files Affected` section (per Plan Format Convention in CLAUDE.md)
4. Run plan review loop (dispatch plan-document-reviewer subagent)
5. Update task: `plan` field with plan path

**Batch mode optimization:** If 2+ tasks, can run plan writing in parallel via `parallel-tmux-agents` — each pane writes one plan. Plan writing is autonomous (no user input needed).

**Sync barrier:** Do NOT proceed to Phase 3 until ALL plans are complete. If running via tmux, wait for all panes to finish.

### Phase 3: Conflict Detect (batch mode only)

**Single mode:** Skip this phase. Assign the single task to wave 1 automatically during state initialization (set `wave: 1` and `waves: [{ wave: 1, tasks: ["A"], status: "pending" }]`).

**Batch mode:**

1. Invoke `conflict-detect` skill — it will scan plan docs and output a conflict report
2. Read the conflict report output
3. Extract wave assignments into `active.json`:
   - Update each task's `wave` field
   - Populate the `waves` array
4. Present waves to user:
   ```
   Execution waves:
   Wave 1 (parallel): Task A, Task C
   Wave 2 (sequential): Task B — depends on A's schema changes

   Override wave assignments? (y/n)
   ```
5. If user wants to override → adjust wave assignments per their input

### Phase 4: Worktree Setup (per wave)

For each task in the current wave:

1. Invoke `superpowers:using-git-worktrees` skill
2. Create worktree with branch name derived from task (e.g., `feat/payment-refund`)
3. Update task: `worktree` and `branch` fields

### Phase 5: Execute (per wave, parallel if multiple tasks)

**If wave has 1 task:**
- Single execution in the worktree
- Invoke `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`
- Include domain skill instructions in agent prompt based on:
  - Phase 1 keyword detection (from task description)
  - Phase 2 file path detection (from plan's `## Files Affected` — e.g., files in `sinaloka-backend/` → `nestjs-expert`)
  - Backend task → "Use `nestjs-expert` skill for NestJS patterns"
  - Frontend task → "Use `frontend-design:frontend-design` skill for UI implementation"
  - Performance task → "Use `performance` skill for optimization patterns"
- Note: TDD steps are already embedded in plans via `superpowers:writing-plans` format

**If wave has 2+ tasks:**
- Invoke `parallel-tmux-agents` skill
- Each pane executes one task in its own worktree
- Each pane's prompt includes:
  - The plan file path
  - Instruction to use `superpowers:subagent-driven-development` or `superpowers:executing-plans`
  - Relevant domain skill instructions (from Phase 1 keyword detection + Phase 2 file path detection)
- Wait for all panes to complete

**On execution failure:**
- Auto-invoke `superpowers:systematic-debugging`
- Retry max 2x
- If still failing → mark task as `failed`, continue other tasks in wave
- Report failed tasks at end of wave:
  ```
  Wave 1 complete:
  - Task A: done
  - Task C: FAILED — [error summary]

  Options for failed tasks: (r)etry, (s)kip, (a)bort pipeline
  ```

### Phase 6: Review (per wave, after execution)

For each SUCCESSFUL task in wave (skip `failed`/`paused` tasks):

1. Switch to task's worktree
2. Invoke `superpowers:requesting-code-review` skill
3. If issues found → auto-fix in worktree → re-review (max 2x)
4. If still has issues after 2 retries → mark task as `failed`, notify user

### Phase 7: Finish (per task that passed review)

For each task that passed review:

1. Invoke `superpowers:finishing-a-development-branch` skill

**CHECKPOINT: PR Approval**
- Set `checkpoint_pending: "pr_approval"` in active.json
- Present the PR diff/summary and ask: **"Approve PR? (y/n)"**
- If rejected → back to Phase 5 with user feedback, or user can drop task
- If approved → set `checkpoint_pending: null`, create PR, merge

2. Update task status to `done`

**After all tasks in wave are handled → proceed to next wave.**

## After Pipeline Completes

When all tasks are `done` or `failed`:

1. Show summary:
   ```
   Pipeline complete:
   - Task A: done (PR #42 merged)
   - Task B: done (PR #43 merged)
   - Task C: failed (build error after retries)
   ```

2. Cleanup:
   - Move `active.json` to `history/YYYY-MM-DD-<first-task-slug>.json`
   - Auto-cleanup worktrees for merged tasks
   - Preserve worktrees with uncommitted changes, warn user
   - Add `status: done` frontmatter to completed plan docs

## State Management

Update `active.json` at every phase transition:
- Before starting a phase: update `phase` and `status` fields
- After completing a phase: update artifact paths (spec, plan, worktree, branch)
- At checkpoints: set `checkpoint_pending` field
- On failure: set status to `failed`

This enables resume if the session ends unexpectedly.

## Edge Cases

| Situasi | Behavior |
|---|---|
| User cancel mid-pipeline | Save state, preserve worktrees with changes, cleanup empty ones |
| User reject design (Phase 1) | Re-brainstorm that task only, others unaffected |
| All tasks parallel (Phase 3) | All in Wave 1, execute via tmux |
| All tasks sequential (Phase 3) | Each task is its own wave, no tmux |
| User overrides waves (Phase 3) | Reassign per user input |
| Task fails execution (Phase 5) | Mark failed, continue wave, report at end |
| PR rejected (Phase 7) | Re-execute with feedback or drop task |
| New task mid-pipeline | Not supported — finish current pipeline first |
| Session ends mid-phase | State in active.json, resume on next `/pipeline` |
````

- [ ] **Step 3: Verify skill is discoverable**

After creating the file, confirm the skill appears in Claude Code's skill list. The skill should show as `pipeline` with its description.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/pipeline/SKILL.md
git commit -m "feat: add pipeline orchestrator skill for full workflow automation"
```

---

### Task 2: Add Pipeline State Directory to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add gitignore entries**

Add these lines to `.gitignore` after `docs/superpowers/conflict-reports/` (around line 25):

```
docs/superpowers/pipeline/
```

Pipeline state files (`active.json`, history) are ephemeral — should not be tracked in git.

- [ ] **Step 2: Verify**

```bash
git status
```

Confirm pipeline directory would not be tracked.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore pipeline state directory"
```

---

### Task 3: Update CLAUDE.md Skill Reference Table

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add pipeline entry to Skill Reference table**

Add this row as the **first data row** after the table header, before "Fitur baru / perubahan besar":

```markdown
| Full workflow (brainstorm → PR) | `/pipeline` |
```

- [ ] **Step 2: Verify the edit**

Read the Skill Reference table and confirm the new row is correctly placed.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add /pipeline to skill reference table"
```

---

## Files Affected

### Modify
- CLAUDE.md
- .gitignore

### Create
- .claude/skills/pipeline/SKILL.md
