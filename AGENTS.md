# AGENTS.md

## Current repo state

- This repo is **spec-first, not scaffolded yet**. There is no `package.json`, Vite config, test config, or CI workflow at the root right now.
- Treat `docs/plans/001-mvp-indoor-design-tool.md` as the active execution plan.
- Treat these ADRs as binding architectural constraints:
  - `docs/adrs/001-canvas-yaml-domain-architecture.md`
  - `docs/adrs/002-design-system-and-theme-pipeline.md`

## Architecture constraints already decided

- Build a **React + TypeScript browser app**.
- Build UI with **Tailwind CSS + shadcn/ui-style headless components**.
- Use **Canvas 2D** for the drawing surface, not SVG/DOM-first rendering.
- Keep **world coordinates in mm**.
- Keep **YAML behind repository interfaces**; do not let UI/state directly depend on YAML file shape.
- Preserve the planned layering: **UI / Application / Domain / Infrastructure / Engine**.

## Design-system workflow

- `DESIGN.md` and its generated `src/styles/theme.css` are the **only theme source of truth**.
- Do not hand-tune colors/tokens in component files, Tailwind config, or ad-hoc CSS if the value belongs in the theme.
- Theme export target is `src/styles/theme.css`.

## Verified gotcha

- `src/styles/theme.css` currently starts with interactive npm prompt text (`Need to install... Ok to proceed?`). It is **not a clean generated artifact** yet. If styling behaves strangely, regenerate this file before debugging anything else.

## How to work in this repo

- Check the plan + ADRs before implementing; this repo already made the big reversible decisions.
- Because there is no runnable app scaffold yet, do **not** invent repo commands. Add commands only after creating the corresponding manifest/config.
- If you introduce implementation structure, align names with the ADR module boundaries (`domains/*`, `engine/canvas`, `infrastructure/storage/yaml`).

<!-- CODEGRAPH_START -->

## CodeGraph

CodeGraph builds a semantic knowledge graph of codebases for faster, smarter code exploration.

### If `.codegraph/` exists in the project

**NEVER call `codegraph_explore` or `codegraph_context` directly in the main session.** These tools return large amounts of source code that fills up main session context. Instead, ALWAYS spawn an Explore agent for any exploration question (e.g., "how does X work?", "explain the Y system", "where is Z implemented?").

**When spawning Explore agents**, include this instruction in the prompt:

> This project has CodeGraph initialized (.codegraph/ exists). Use `codegraph_explore` as your PRIMARY tool — it returns full source code sections from all relevant files in one call.
>
> **Rules:**
>
> 1. Follow the explore call budget in the `codegraph_explore` tool description — it scales automatically based on project size.
> 2. Do NOT re-read files that codegraph_explore already returned source code for. The source sections are complete and authoritative.
> 3. Only fall back to grep/glob/read for files listed under "Additional relevant files" if you need more detail, or if codegraph returned no results.

**The main session may only use these lightweight tools directly** (for targeted lookups before making edits, not for exploration):

| Tool                                      | Use For                              |
| ----------------------------------------- | ------------------------------------ |
| `codegraph_search`                        | Find symbols by name                 |
| `codegraph_callers` / `codegraph_callees` | Trace call flow                      |
| `codegraph_impact`                        | Check what's affected before editing |
| `codegraph_node`                          | Get a single symbol's details        |

### If `.codegraph/` does NOT exist

At the start of a session, ask the user if they'd like to initialize CodeGraph:

"I notice this project doesn't have CodeGraph initialized. Would you like me to run `codegraph init -i` to build a code knowledge graph?"

<!-- CODEGRAPH_END -->
