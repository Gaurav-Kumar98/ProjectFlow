<div align="center">

<img src="public/logo.png" alt="ProjectFlow logo" width="110" height="110" />

# ProjectFlow

**Ultra-fast, local-first kanban for AI-assisted tech projects.**

_Open it → type a task or paste a screenshot → press Enter → keep building._

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![MCP](https://img.shields.io/badge/MCP-server-6E56CF)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

ProjectFlow is a **local-first** kanban for a solo, AI-assisted builder juggling several projects at once — a fast backlog for features, bugs, UI fixes, screenshots, and ideas. One principle: **capture first, organize later.** Everything runs on your machine and lives in a single local SQLite database.

<div align="center">
  <img src="docs/board.png" alt="ProjectFlow board: kanban columns with task cards (type, priority, tags) and a screenshot attached to a bug card." width="100%" />
</div>

## Getting Started

**Prerequisites**

- **Node.js 22.5+** (24 LTS recommended) — uses the built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html), so there's no native build step. On Node 22.5–23.x, enable it with `--experimental-sqlite`.
- **npm** (bundled with Node).
- **Windows** is only needed for the desktop shortcut/launcher — the app itself runs anywhere Node does.

**Run it**

```bash
git clone https://github.com/Gaurav-Kumar98/ProjectFlow.git
cd ProjectFlow
npm install
npm run dev          # → http://127.0.0.1:3344
```

Production build: `npm run build && npm run start`.

**Windows one-click setup**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File setup.ps1   # or double-click setup.bat
```

Installs dependencies, builds, creates the data folders under `%LOCALAPPDATA%\ProjectFlow`, and adds a **ProjectFlow** desktop shortcut that starts the server (if needed) and opens the app in Edge/Chrome app mode — no terminal required.

## Features

- 🗂️ **Multi-project kanban** with customizable columns (`Inbox → Backlog → Next → In Progress → Review/Test → Done`).
- ⚡ **Frictionless capture** — type a title, hit Enter, done (~3s). The input stays focused for rapid entry.
- 📸 **Screenshot-first** — paste from the clipboard (`Ctrl+V`) or drag a file to create a task with the image attached; drop onto a card to attach it there.
- 🧱 **Phases** — build step-by-step, mark one phase active, and filter the board by phase.
- 🔀 **Drag-and-drop** within and across columns; order and status persist instantly ([dnd-kit](https://dndkit.com/)).
- 🏷️ **Types, priorities, tags** — Feature/Bug/Enhancement/UI Fix/Refactor/…, Low→Urgent, and freeform tags.
- 🤖 **AI autofill (Gemini)** — suggest a title, description, type, and tags from your text and screenshots.
- 🔌 **MCP server** — drive your board from any [Model Context Protocol](https://modelcontextprotocol.io/) client.
- 🎨 **Custom project icons** — initials, a built-in icon, or an uploaded image per project.
- 💾 **Local-first** SQLite storage with one-click ZIP **export/import**.
- 🪟 **Desktop-app feel** and 🌙 **dark-mode-first**, polished UI.

## Usage

1. **Create a project** — it starts with the six default columns and a default phase.
2. **Capture** — type in a column's quick-add input and press **Enter**; repeat hands-free.
3. **Screenshots** — copy an image (`Win+Shift+S`), focus the board, press **Ctrl+V**, add an optional title, Enter. Untitled captures become _"Untitled screenshot task."_
4. **Organize** — drag cards between columns, set type/priority/tags, and group work by phase.
5. **Task panel** — click a card to edit details, manage attachments, and archive/restore.
6. **Search & filter** by title, description, tags, type, phase, priority, and attachments.

## AI Autofill (Gemini)

1. Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Paste it in **Settings** — it's stored in your local database, **never** in source or git.
3. Run autofill on a task; Gemini returns a suggested `title`, `description`, `taskType`, and `tags`.

Without a key, the endpoint returns `401` and AI stays off. See [`ai/autofill/route.ts`](src/app/api/ai/autofill/route.ts).

## MCP Server

Run `npm run mcp` to expose your board to AI assistants over stdio. Tools: `get_projects`, `get_phases`, `get_columns`, `get_tasks`, `get_task`, `create_task`, `update_task`, `move_task`, `delete_task`.

```json
{
  "mcpServers": {
    "projectflow": { "command": "npx", "args": ["tsx", "src/mcp/index.ts"], "cwd": "C:\\path\\to\\ProjectFlow" }
  }
}
```

Source: [`src/mcp/index.ts`](src/mcp/index.ts).

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PROJECTFLOW_DATA_DIR` | `%LOCALAPPDATA%\ProjectFlow` (else `<cwd>/ProjectFlow`) | Data root: database, attachments, icons, backups, logs. |
| `PORT` | `3344` | Port used by the `*:local` scripts and the launcher. |

## Data & Backup

All data lives **outside the repo** (git-ignored) under your data root — `projectflow.db`, `attachments/`, `icons/`, `backups/`, `logs/`. Use in-app **Export** for a ZIP (database + attachments); **Import** restores one and safety-copies the current database to `backups/pre-import-*.db` first.

## Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 3 · `node:sqlite` · [@dnd-kit](https://dndkit.com/) · [lucide-react](https://lucide.dev/) · [`@google/genai`](https://github.com/googleapis/js-genai) · [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) · [adm-zip](https://github.com/cthackers/adm-zip).

## Scripts

`dev` · `dev:local` · `build` · `start` · `start:local` · `typecheck` · `mcp` — see [`package.json`](package.json).

## Contributing & License

Personal tool, but issues and PRs are welcome — run `npm run typecheck` before opening one. Released under the [MIT License](LICENSE).
