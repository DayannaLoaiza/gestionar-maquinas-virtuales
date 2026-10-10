---
name: deep-research
description: 'Deep investigation of this monorepo. Traces data flows, maps dependencies, and answers architectural questions about apps/backend, apps/frontend and packages'
model: sonnet
context: fork
agent: Explore
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
argument-hint: '<question-about-codebase>'
---

# Deep Codebase Research

Investigate the question provided in $ARGUMENTS by thoroughly exploring the monorepo.

## Investigation Protocol

1. **Understand the Question**: Parse $ARGUMENTS to identify what aspect of the codebase needs
   investigation (data flow, architecture, dependency, pattern usage, etc.)

2. **Read Context Files**: This skill runs in the Explore agent, which loads no `CLAUDE.md`. Read
   them explicitly:
   - Root `CLAUDE.md` and `docs/constitution.md` for monorepo overview and principles
   - `apps/frontend/CLAUDE.md` for frontend patterns
   - `apps/backend/CLAUDE.md` for backend patterns
   - `.claude/rules/shared-types.md` if the question touches DTOs or contracts

3. **Map the Relevant Area**: Use Glob to find all files in the relevant modules, then Grep to
   trace references across the codebase. Follow imports and exports to understand the dependency
   graph.

4. **Trace Data Flows**: For any feature, trace the complete path:
   - **Frontend**: Page (Server Component) → `serverFetch` / Client component → `fetch-wrapper` →
     `/api/*` rewrite → response handling → UI
   - **Backend**: Controller → Pipe (`ZodValidationPipe`) → Service → Repository → store
   - **Cross-app**: DTO in `@vm/shared-types` → backend validation → response envelope
     `{ success, data }` → frontend type in `src/types/api.ts`

5. **Analyze Dependencies**: Check the `package.json` of `apps/*` and `packages/*` for shared
   dependencies and version alignment.

6. **Document Findings**: Return a detailed analysis that includes:
   - Direct answer to the question
   - Relevant file paths
   - Code references with line numbers for key findings
   - Architecture diagrams in text form if helpful
   - Potential concerns or improvements discovered during investigation
   - Related areas that may also be affected

Be thorough. Read every file that could be relevant. Cross-reference between apps to find
inconsistencies or shared patterns.
