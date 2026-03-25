# Parallel Planning Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable parallel execution of multiple implementation plans by detecting file conflicts between them and suggesting optimal execution order.

**Architecture:** Two components — (1) a convention added to CLAUDE.md enforcing `## Files Affected` section in every plan doc, (2) a new project-scoped skill `/conflict-detect` that scans plan docs and outputs a dependency matrix with execution waves.

**Tech Stack:** Claude Code skills (SKILL.md), Markdown conventions, .gitignore

**Spec:** `docs/superpowers/specs/2026-03-23-parallel-planning-workflow-design.md`

---

### Task 1: Add `## Files Affected` Convention to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

This task adds a new subsection under the existing development workflow documentation that instructs Claude to always append a `## Files Affected` section at the end of every plan document.

- [ ] **Step 1: Add "Plan Format Convention" section to CLAUDE.md**

Add the following after the `### Skill Reference` table in CLAUDE.md, before `### GitHub Flow`:

```markdown
### Plan Format Convention

Every implementation plan (in `docs/superpowers/plans/`) MUST end with a `## Files Affected` section that lists all files the plan will touch. This enables conflict detection between plans for parallel execution.

Format:

\`\`\`markdown
## Files Affected

### Modify
- src/modules/payment/payment.service.ts
- prisma/schema.prisma

### Create
- src/modules/payment/dto/refund.dto.ts

### Delete
- src/modules/payment/legacy-payment.helper.ts
\`\`\`

Rules:
- Paths relative from project root
- Three categories: **Modify**, **Create**, **Delete** — omit empty categories
- Only files that will be changed, not files read for reference
- Plans are considered "done" when they have frontmatter `status: done` or are moved to `docs/superpowers/plans/archive/`
```

- [ ] **Step 2: Verify the edit**

Read `CLAUDE.md` and confirm the new section is correctly placed and formatted.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Files Affected convention for plan documents"
```

---

### Task 2: Create `/conflict-detect` Skill

**Files:**
- Create: `.claude/skills/conflict-detect/SKILL.md`

This is the main deliverable — a project-scoped Claude Code skill that scans plan docs, detects file overlaps, and outputs execution waves.

- [ ] **Step 1: Create the skill directory**

```bash
ls /home/zet/Project/sinaloka/.claude/skills/
```

Confirm the directory exists (it should — `brand-guidelines` is already there).

- [ ] **Step 2: Write the SKILL.md**

Create `.claude/skills/conflict-detect/SKILL.md` with the following content:

```markdown
---
name: conflict-detect
description: Use when the user has 2+ implementation plans and wants to know which can run in parallel. Detects file conflicts between plan docs and suggests execution waves. Trigger on "conflict detect", "which plans can run parallel", "check plan overlap", or before executing multiple plans.
---

# Conflict Detection for Parallel Plans

Scan implementation plan documents, detect overlapping files between them, and output a dependency matrix with recommended execution waves.

## When To Use

- User has 2+ plan docs in `docs/superpowers/plans/` ready to execute
- Before starting parallel execution of multiple plans
- User asks "which plans can I run in parallel?"

## Process

### Step 1: Identify Plans

Scan `docs/superpowers/plans/` for plan docs that are NOT yet executed:
- Skip files with frontmatter `status: done`
- Skip files in `docs/superpowers/plans/archive/`
- If user provides specific plan paths, use those instead of auto-scan

List the plans found and confirm with the user which ones to analyze.

### Step 2: Extract Files Affected

For each plan, parse the `## Files Affected` section at the end of the document. Collect file paths grouped by action (Modify/Create/Delete).

If a plan is missing the `## Files Affected` section:
- Read the plan content and generate the section
- Ask the user to confirm before proceeding
- Append the section to the plan doc

### Step 3: Compare and Classify Overlaps

Cross-reference all file paths between every pair of plans. Classify each overlap:

| Overlap Type | Risk Level |
|---|---|
| No overlap | None — full parallel |
| Create-Create | **High** — design conflict, same file created by two plans |
| Modify-Modify | **Medium** — potential merge conflict |
| Modify-Delete | **High** — intent conflict |
| Create-Modify | **Low** — create plan must run first |
| Create-Delete | **High** — intent conflict |
| Delete-Delete | **Low** — idempotent, but flag as possible design issue |

### Step 4: Build Dependency Matrix

Create an N×N table of plans. Each cell shows the highest risk level between that pair.

### Step 5: Determine Execution Waves

- Plans with **None** overlap between them → same wave (parallel)
- Plans with **Medium** or **High** overlap → sequential waves
- To determine order: READ the plan content for context. The plan that sets up infrastructure, schema, or foundational code goes first. This is a heuristic judgment — file overlap is a signal, but plan content determines the actual dependency direction.

### Step 6: Output Report

Print the report to terminal AND save to `docs/superpowers/conflict-reports/YYYY-MM-DD-report.md`.

## Output Format

Use this exact format:

~~~markdown
# Conflict Detection Report

**Date:** YYYY-MM-DD
**Plans analyzed:** N

## Plans

| # | Plan | File |
|---|------|------|
| A | [Plan title] | docs/superpowers/plans/[filename].md |
| B | [Plan title] | docs/superpowers/plans/[filename].md |

## Dependency Matrix

|   | A | B |
|---|---|---|
| A | — | [Risk Level] |
| B | [Risk Level] | — |

## Overlapping Files

### [Plan X] ↔ [Plan Y] ([Risk Level])

| File | Plan X | Plan Y |
|------|--------|--------|
| [path] | [action] | [action] |

**Reasoning:** [Why this overlap matters and which plan should go first]

## Execution Waves

### Wave 1 (parallel)
- **Plan A** — [title]
- **Plan C** — [title]

### Wave 2 (after Wave 1)
- **Plan B** — [title]
  - *Reason:* [why it depends on Wave 1]
~~~

### No-Conflict Output

If all plans have zero file overlap, output:

> All N plans can execute in parallel — no overlapping files detected.

Save a minimal report file with just the plans list and this verdict.

## Key Rules

- Report files are **ephemeral** — saved locally for reference but gitignored
- This skill only ANALYZES — it does not execute plans
- If overlap is ambiguous, err on the side of sequential (safer)
- Always read plan content for ordering heuristics, not just the file matrix
```

- [ ] **Step 3: Verify the skill is discoverable**

Read back the file and confirm frontmatter format matches the pattern used by other skills (check `name` and `description` fields).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/conflict-detect/SKILL.md
git commit -m "feat: add conflict-detect skill for parallel plan analysis"
```

---

### Task 3: Add Conflict Reports to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add gitignore entry**

Add this line to `.gitignore` after the existing `docs/` rules (around line 23-25):

```
docs/superpowers/conflict-reports/
```

Since `.gitignore` already has `docs/` ignored with `!docs/superpowers/` exception, the conflict-reports directory falls under the superpowers exception and would be tracked. We need to explicitly ignore it.

- [ ] **Step 2: Verify**

Run `git status` to confirm no conflict-report files would be tracked.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore conflict detection reports"
```

---

## Files Affected

### Modify
- CLAUDE.md
- .gitignore

### Create
- .claude/skills/conflict-detect/SKILL.md
