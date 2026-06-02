# ProjectFlow — Product Requirements Document

**Ultra-fast, local-first kanban for AI-driven tech projects.**

> **Document status:** Reflects the current shipped state of the app (v0.1.0).
> This is a living spec — it describes what ProjectFlow *is today*, plus near-term backlog and explicit non-goals.
> **Notable change:** per-project desktop shortcuts have been **removed** from scope (see [§11](#11-non-goals--removed-scope)). AI autofill and an MCP server — originally out of scope — are now shipped.

---

## 1. Product Summary

ProjectFlow is a local-first project-management web app for a solo, AI-assisted builder who manages multiple tech projects at once. It provides an extremely fast kanban backlog for features, bugs, enhancements, UI fixes, screenshots, and implementation ideas.

It is a Next.js/React web app (not Electron) that runs locally on Windows and opens in the browser — ideally via a desktop shortcut in Edge/Chrome "app mode" so it feels like a native app while keeping full web-UI flexibility.

The guiding principle:

> **Capture first. Organize later.**

The app should feel like a custom personal tool, not Jira, Notion, ClickUp, or Trello.

---

## 2. Core Vision

Open the app → see the project board → type a task or paste a screenshot → press Enter → keep building.

The default flow is always: **open → capture → continue working.** The user should never feel like they are "maintaining a project-management system."

---

## 3. Target User & Problem

The primary user is a solo developer / researcher / AI-assisted builder running several tech projects in parallel, building phase-by-phase. While working they constantly notice bugs, missing features, UI problems, and ideas — and frequently take screenshots they want attached to backlog items with minimal friction.

Existing tools are too slow for this. Opening a heavy app, creating a full ticket, selecting many fields, and manually uploading screenshots breaks flow. **The bottleneck is capture friction, not organization.** ProjectFlow optimizes for the speed of capture above everything else.

---

## 4. Platform & Architecture

A local web app — **not** Electron.

| Concern | Implementation |
|---------|----------------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 (dark-mode-first) |
| Drag & drop | `@dnd-kit` |
| Icons | `lucide-react` |
| Database | Built-in `node:sqlite` (no native build step) |
| Attachments/backup | Local filesystem + `adm-zip` for ZIP export/import |
| AI | Google Gen AI SDK (`@google/genai`) — Gemini |
| Automation | Model Context Protocol SDK (stdio server) |
| Launcher | PowerShell scripts (Windows) |

- The server runs locally at **`http://127.0.0.1:3344`** (configurable via `PORT`).
- The backend is implemented as Next.js API routes: `health`, `state`, `projects`, `phases`, `columns`, `tasks` (+ `tasks/reorder`, `tasks/restore`), `attachments`, `files/*`, `backup/export`, `backup/import`, and `ai/autofill`.
- All data is stored locally — **no accounts, no cloud, no network dependency** (except the optional Gemini call for AI autofill).

---

## 5. Data Model

Source of truth: [`src/lib/types.ts`](src/lib/types.ts).

- **Project** — `id`, `name`, `description`, `iconType` (`letter` | `emoji` | `built_in` | `upload`), `iconValue`, `iconPath`, `color`, `status` (`Active` | `Paused` | `Completed` | `Archived`), `lastOpenedAt`, timestamps, `archivedAt`.
- **Phase** — `id`, `projectId`, `name`, `description`, `orderIndex`, `status` (`Planned` | `Active` | `Completed` | `Archived`), `isActive`, timestamps.
- **BoardColumn** — `id`, `projectId`, `name`, `orderIndex`, timestamps.
- **Task** — `id`, `projectId`, `phaseId?`, `columnId`, `title`, `description`, `notes`, `taskType`, `priority`, `orderIndex`, timestamps, `archivedAt`, plus `tags[]` and `attachments[]`.
- **Attachment** — `id`, `taskId`, `fileName`, `filePath`, `thumbnailPath?`, `fileType`, `fileSize`, `width?`, `height?`, `createdAt`, `url`.
- **Tag** — `id`, `name`, `color`; many-to-many with tasks.
- **Settings** — default project, default quick-add column, default phase behavior (`active` | `none`), theme (`dark` | `light` | `system`), browser open mode (`default` | `edge-app` | `chrome-app`), local server port, attachment/backup locations, confirm-before-delete, and Gemini API key.

---

## 6. Core Workflows

### 6.1 Quick text capture
Each column has an inline `Add task…` input. Type a title, press **Enter**, and the task is created instantly in that column — no modal, input stays focused for rapid multi-task entry. Target: under 3 seconds.

### 6.2 Screenshot capture (clipboard)
Copy an image (e.g. `Win+Shift+S`), focus the board, press **Ctrl+V**. A quick-create box appears; type an optional title and press Enter. The task is created with the screenshot attached. With no title it becomes "Untitled screenshot task." Target: under 5 seconds.

### 6.3 Drag image onto board
Drag an image file from Explorer onto a column to create a task with it attached, or onto an existing card to attach it there. Supported: PNG, JPG/JPEG, WEBP, GIF.

### 6.4 Drag-and-drop kanban
Reorder within a column and move across columns; status follows the target column and order persists immediately. Designed to stay smooth with hundreds of tasks per project.

### 6.5 Task detail panel
Clicking a card opens a side panel (without leaving the board) to edit title, description, notes, phase, column/status, type, priority, tags, and attachments, and to archive/restore. Images can be pasted directly into the panel and previewed full-screen.

### 6.6 Search & filters
Search across title, description, tags, type, project, and phase. Filter by phase, column, priority, type, tags, and whether a task has images.

---

## 7. Projects, Phases & Board

- **Multiple projects**, listed in the sidebar with their icons and status; one project open at a time at `/projects/<projectId>`.
- **Project icons** — initials (`letter`), a built-in icon, or an uploaded image; plus a project color. (Used for in-app display, not for OS shortcuts.)
- **Phases** let the user build step-by-step (e.g. MVP → Polish → Advanced). One phase can be **active**, and the board can be filtered to it. Each task optionally belongs to a phase.
- **Default columns** for every new project: `Inbox`, `Backlog`, `Next`, `In Progress`, `Review/Test`, `Done`. Columns can be renamed, reordered, added, and deleted (with reassignment of existing tasks).
- **Task types:** Feature, Bug, Enhancement, UI Fix, Refactor, Research, Idea, AI Prompt, Note (optional).
- **Priorities:** Low, Medium, High, Urgent (optional; shown on the card only when set).
- **Tags:** freeform, colored, many per task.

---

## 8. AI Autofill (Gemini)

ProjectFlow can use Google Gemini to fill in task metadata from the provided context (text and/or attached screenshots). Given a task, it returns a suggested `title`, `description`, `taskType`, and `tags`.

- The Gemini API key is set in **Settings** and stored in the local database — never in source or git.
- If no key is configured, `ai/autofill` returns `401` and AI features stay disabled.
- Implemented in [`src/app/api/ai/autofill/route.ts`](src/app/api/ai/autofill/route.ts).

---

## 9. MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server ([`src/mcp/index.ts`](src/mcp/index.ts), run via `npm run mcp`) lets AI assistants manage the board over stdio against the same local database.

Tools: `get_projects`, `get_phases`, `get_columns`, `get_tasks`, `get_task`, `create_task`, `update_task`, `move_task`, `delete_task`.

---

## 10. Local Storage, Backup & Settings

- **Data root:** `%LOCALAPPDATA%\ProjectFlow` (override with `PROJECTFLOW_DATA_DIR`; falls back to `<cwd>/ProjectFlow` off-Windows). Contains `projectflow.db`, `attachments/`, `icons/projects/`, `backups/`, and `logs/`.
- **Export:** a single ZIP containing the database and attachments.
- **Import:** restores from a ZIP and first safety-copies the current database to `backups/pre-import-*.db`.
- **Settings:** theme, default project, default quick-add column, default phase behavior, browser open mode, local server port, confirm-before-delete, and Gemini key.

---

## 11. Desktop Shortcut & Launcher

ProjectFlow is a web app that should open from Windows like a native one — via a **single main desktop shortcut**.

- `setup.ps1` (or `setup.bat`) installs dependencies, builds, creates the data folders, and generates a **ProjectFlow** desktop shortcut.
- The launcher ([`scripts/Start-ProjectFlow.ps1`](scripts/Start-ProjectFlow.ps1)) checks whether the server is healthy on the configured port, starts it if not, waits until it's ready, and opens the app — preferring Edge/Chrome **app mode**, falling back to the default browser. It avoids spawning duplicate server processes.

**Acceptance criteria**

- The shortcut starts the server (if needed) and opens the app; works after reboot.
- No duplicate server instances.
- Launcher failures surface a clear error (and log to `logs/server.log`).

---

## 12. Non-Goals & Removed Scope

**Removed from scope**

- ❌ **Per-project desktop shortcuts** and per-project custom shortcut icons. Only the single main launcher shortcut is supported. (Project icons remain, but for in-app display only.)

**Out of scope (by design — local-first, single-user)**

- Team collaboration, multi-user, accounts/auth
- Cloud sync or hosted database
- Mobile app
- In-app GitHub/issue-tracker integration
- Notifications, calendar, time tracking, Gantt charts, heavy analytics
- Global OS-wide hotkeys (a pure web app can't register these without a native helper)

---

## 13. Keyboard Shortcuts

Active while the ProjectFlow window/tab is focused:

- **Enter** — save the quick-add task
- **Ctrl + V** — paste a clipboard image as a new task / attachment
- **Ctrl + N** — new task
- **Ctrl + F** — search
- **Esc** — close the panel/modal

---

## 14. Roadmap / Backlog

- [ ] Demo screenshots / GIFs in the README *(done — board screenshot added)*
- [ ] Cross-platform launcher (macOS/Linux)
- [ ] Checklists on tasks
- [ ] Richer dashboard analytics
- [ ] Automated tests & CI
- [ ] Clean up vestigial `desktop_shortcuts` table / `saveShortcutRecord` left from the removed per-project-shortcut feature

---

## 15. Success Criteria

ProjectFlow succeeds if the user:

1. Opens the app from a desktop icon, with no manual terminal steps.
2. Creates a text task in under 3 seconds.
3. Creates a screenshot-backed task in under 5 seconds.
4. Manages multiple projects without confusion and organizes work phase-by-phase.
5. Prefers it over Trello/Notion/Jira/ClickUp for personal backlog management.
6. Feels like they're capturing useful work items while building — not maintaining a PM system.
