# Pipeline Orchestrator Design

**Date:** 2026-03-23
**Scope:** Workflow automation — skill orchestration
**Project:** Sinaloka

> **Nature of this skill:** This is a **guided orchestration** skill, not an enforced state machine. Claude follows the pipeline instructions best-effort. State tracking via `active.json` is an aid for resume, not a mechanical enforcement. Claude may deviate when context demands it — the skill provides structure, not rigidity.

## Problem

Saat mengerjakan fitur, banyak skill yang harus dipanggil manual secara berurutan: `brainstorming` → `writing-plans` → `using-git-worktrees` → `executing-plans` / `subagent-driven-development` → `requesting-code-review` → `finishing-a-development-branch`. Domain skills seperti `nestjs-expert`, `frontend-design`, dan `performance` juga harus dipanggil terpisah. Ini menyebabkan workflow tidak konsisten dan ada step yang sering terlewat.

## Solution Overview

Satu skill baru `/pipeline` yang menjadi single entry point untuk seluruh development workflow. Pipeline:
- Terima task description (single atau batch)
- Auto-detect scope, domain, dan relevant skills
- Run full pipeline: brainstorm → plan → conflict detect → worktree → execute → review → PR
- Dua checkpoint: approve design + approve PR
- Batch mode: parallel execution via `parallel-tmux-agents` untuk tasks tanpa dependency

## Skill Dependencies

All skills referenced in this pipeline already exist. Here is where each lives:

| Skill | Source | Location |
|---|---|---|
| `brainstorming` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/brainstorming/` |
| `writing-plans` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/writing-plans/` |
| `using-git-worktrees` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/using-git-worktrees/` |
| `subagent-driven-development` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/subagent-driven-development/` |
| `executing-plans` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/executing-plans/` |
| `requesting-code-review` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/requesting-code-review/` |
| `finishing-a-development-branch` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/finishing-a-development-branch/` |
| `systematic-debugging` | superpowers plugin | `~/.claude/plugins/.../superpowers/5.0.5/skills/systematic-debugging/` |
| `parallel-tmux-agents` | user-global skill | `~/.claude/skills/parallel-tmux-agents/` |
| `nestjs-expert` | user-global skill | `~/.claude/skills/nestjs-expert/` |
| `frontend-design` | official plugin | `~/.claude/plugins/.../frontend-design/` |
| `performance` | user-global skill | `~/.claude/skills/performance/` |
| `conflict-detect` | project skill | `.claude/skills/conflict-detect/` |

## Pipeline Phases

| Phase | Skill(s) | Condition | Checkpoint? |
|---|---|---|---|
| 1. Brainstorm | `brainstorming`, `frontend-design` (kalau UI task) | Always | **Yes — approve design** |
| 2. Plan | `writing-plans` | Always | No |
| 3. Conflict Detect | `conflict-detect` | Batch only (2+ tasks) | No |
| 4. Worktree | `using-git-worktrees` | Always (each task gets own worktree) | No |
| 5. Execute | Wave-based parallel via `parallel-tmux-agents` + `subagent-driven-development` / `executing-plans` + domain skills | Always | No |
| 6. Review | `requesting-code-review` | Per task, after each wave completes | No |
| 7. Finish | `finishing-a-development-branch` | Per task | **Yes — approve PR** |

### Domain Skills (auto-invoked during Phase 5)

| Skill | Trigger Condition |
|---|---|
| `nestjs-expert` | Task touches `sinaloka-backend/` — controllers, services, modules, DTOs, guards |
| `frontend-design` | Task creates/modifies UI components, pages, layouts di any frontend app |
| `performance` | Task mention "optimize", "speed", "performance", "load time", atau explicit performance goal |

Domain skills are invoked by including the skill name in the execution agent's prompt instruction. Example: when spawning a tmux pane or subagent for a backend task, the prompt includes "Use the `nestjs-expert` skill for NestJS patterns." This makes the agent invoke the skill on its own. Multiple domain skills can stack for tasks spanning backend + frontend.

**On-demand skills (tidak auto, hanya saat dibutuhkan):**
- `systematic-debugging` — hanya kalau execution gagal / test fail
- `test-driven-development` — sudah embedded di `writing-plans` format (TDD steps)

## Invocation & Modes

**Single task:**
```
/pipeline add refund feature for payment module
```

**Batch:**
```
/pipeline
- add refund feature for payment module
- redesign student enrollment page
- fix attendance notification bug
```

Auto-detect mode dari input:
- 1 task description → **single mode** (skip Phase 3, no tmux, but still creates worktree + branch + PR)
- 2+ task descriptions (bullet list atau newline-separated) → **batch mode**

## Checkpoint Mechanism

Pipeline has exactly two checkpoints. At each checkpoint:

1. Claude presents the artifact (design / PR diff) and asks **"Approve? (y/n)"**
2. Pipeline blocks — no further phases run until user responds
3. If approved → continue to next phase
4. If rejected → Claude re-works (re-brainstorm / re-execute with feedback), then re-presents
5. In batch mode, checkpoints are per-task (user approves each task's design individually, each task's PR individually)
6. If session ends during checkpoint, `active.json` records `"checkpoint_pending": "design_approval"` (or `"pr_approval"`). On resume, Claude re-presents the artifact for approval.

## Full Pipeline Flow

### Phase 1: Brainstorm (per task, sequential)

```
For each task:
  1. Invoke brainstorming skill
  2. Auto-detect: UI task? → invoke frontend-design during brainstorm
  3. Present design → CHECKPOINT: user approve design
  4. Write spec doc
  5. Spec review loop (subagent reviewer)
```

Sequential because user needs to approve each design.

### Phase 2: Plan (per task, parallelizable)

```
For each task:
  1. Invoke writing-plans skill
  2. Enforce ## Files Affected section
  3. Plan review loop (subagent reviewer)
```

In batch mode, can run parallel via tmux since plan writing is autonomous.

**Sync barrier:** All plans must complete before Phase 3 starts. If running via tmux, wait for all panes to finish before proceeding.

### Phase 3: Conflict Detect (batch only)

```
1. Invoke conflict-detect skill
2. Scan all plans from Phase 2
3. Output: conflict report to docs/superpowers/conflict-reports/
4. Extract wave assignments from report into active.json
5. Present waves to user — user can override wave assignment if they disagree
```

### Phase 4-7: Execute per Wave

```
For each wave:
  Phase 4 — Worktree:
    Each task in wave gets own worktree + branch

  Phase 5 — Execute:
    If wave has 1 task → single execution
    If wave has 2+ tasks → parallel-tmux-agents
      Each pane runs:
        - subagent-driven-development (or executing-plans)
        - with domain skills in prompt: nestjs-expert, frontend-design, performance
        - if execution fails → auto-invoke systematic-debugging

  Phase 6 — Review:
    For each SUCCESSFUL task in wave (skip failed/paused tasks):
      - Invoke requesting-code-review
      - If issues found → fix in worktree → re-review (max 2x)
    Report failed tasks to user at end of wave.

  Phase 7 — Finish:
    For each task that passed review:
      - Invoke finishing-a-development-branch
      - CHECKPOINT: user approve PR
      - Create PR, merge

  → Next wave
```

## State Tracking

State disimpan di `docs/superpowers/pipeline/` supaya bisa resume kalau session putus:

```
docs/superpowers/pipeline/
  active.json          # current pipeline state
  history/             # completed pipeline logs
```

### Status Values

Task status enum:
- `pending` — not yet started
- `in_progress` — currently executing a phase
- `done` — all phases complete, PR merged
- `failed` — execution or review failed after retries, needs user intervention
- `paused` — paused mid-execution (session ended or user cancelled)

Wave status enum:
- `pending` — not yet started
- `in_progress` — tasks in this wave are executing
- `done` — all tasks in wave completed or handled (done/failed)

### active.json format

```json
{
  "version": 1,
  "mode": "batch",
  "created_at": "2026-03-23T10:00:00Z",
  "tasks": [
    {
      "id": "A",
      "description": "add refund feature",
      "phase": "execute",
      "wave": 1,
      "spec": "docs/superpowers/specs/2026-03-23-payment-refund-design.md",
      "plan": "docs/superpowers/plans/2026-03-23-payment-refund.md",
      "worktree": ".worktrees/feat/payment-refund",
      "branch": "feat/payment-refund",
      "status": "in_progress"
    }
  ],
  "waves": [
    { "wave": 1, "tasks": ["A", "C"], "status": "in_progress" },
    { "wave": 2, "tasks": ["B"], "status": "pending" }
  ],
  "checkpoint_pending": null
}
```

### Resume

Saat session baru dimulai, kalau user panggil `/pipeline` dan `active.json` exists:

```
Pipeline aktif ditemukan:
- Mode: batch (3 tasks)
- Progress: Wave 1 executing (Task A: done, Task C: in_progress)
- Next: Lanjutkan Task C execution

Lanjutkan? (y/n)
```

Resume mulai dari phase terakhir yang belum complete per task.

## Edge Cases

| Situasi | Behavior |
|---|---|
| User cancel mid-pipeline | Save state to `active.json`, preserve all worktrees with changes (even uncommitted), only cleanup empty worktrees |
| Brainstorm: user reject design | Re-brainstorm task tersebut, tidak affect task lain |
| Conflict detect: semua parallel | All tasks in Wave 1, langsung all-parallel via tmux |
| Conflict detect: semua sequential | Each task is its own wave, execute one by one, no tmux |
| Conflict detect: user disagrees with waves | User can override — reassign tasks to different waves before execution starts |
| Task gagal di execution | Mark task as `failed`, continue other tasks in wave. Report failed tasks at end of wave. User decides: retry, skip, or abort pipeline |
| PR rejected oleh user | Back to Phase 5 (re-execute with feedback), atau user can drop task from pipeline |
| New task added mid-pipeline | Tidak support — selesaikan pipeline dulu, lalu `/pipeline` baru |
| Build/test failure Phase 5 | Auto-invoke `systematic-debugging`, retry max 2x, kalau masih gagal → mark `failed`, notify user |
| Code review issues Phase 6 | Auto-fix, re-review max 2x, kalau masih ada → mark `failed`, notify user |
| Session ends mid-phase | State saved to `active.json` with current phase + status. Resume picks up from last saved state |

## Cleanup

Setelah pipeline selesai:
1. Move `active.json` ke `history/YYYY-MM-DD-<first-task-slug>.json` (slug from first task description)
2. Worktrees yang sudah merged → auto-cleanup
3. Worktrees with uncommitted changes → preserve, warn user
4. Plan docs → tambah frontmatter `status: done`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Nature | Guided orchestration skill (best-effort) | Skill = markdown prompt, not enforced state machine. State tracking aids resume but doesn't guarantee enforcement |
| Entry point | Single `/pipeline` skill | One command to rule them all |
| Checkpoints | Design approval + PR approval (per task) | Full auto tapi user tetap control quality gates |
| Batch execution | parallel-tmux-agents per wave | Maximize throughput untuk independent tasks |
| Skill detection | Auto from task description + file paths in plan | No manual tagging needed |
| State persistence | JSON file in docs/superpowers/pipeline/ | Enables resume across sessions |
| Phase 1 sequential | Always | User approval needed per design |
| Phase 2 parallelizable | Via tmux if batch, sync barrier before Phase 3 | Plan writing is autonomous, no user input needed |
| Single mode | Still creates worktree + branch + PR | Pipeline always runs full flow |
| New tasks mid-pipeline | Not supported | Keep pipeline simple, avoid state complexity |
