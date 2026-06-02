# Product Requirements Document

# ProjectFlow — Ultra-Fast Local Web Kanban App for AI-Driven Tech Projects

## 1. Product Summary

ProjectFlow is a local-first project management web app designed for a solo AI-assisted builder who manages multiple tech projects at once. The app provides an extremely fast kanban-based backlog system for features, bugs, enhancements, UI fixes, screenshots, and implementation ideas.

The app should be built as a modern React/Next.js web app instead of an Electron desktop app. It should run locally on the user’s Windows machine and open in the browser through a desktop shortcut icon. The shortcut should make the app feel like a normal desktop app while still giving the full flexibility of a web UI.

A key requirement is that the desktop icon should be customizable, especially for specific projects. The user should be able to create separate project-specific desktop shortcuts, each with its own custom icon, that opens directly to that project’s kanban board.

---

## 2. Core Product Vision

The app should feel like this:

Open from desktop icon → instantly see the project board → paste screenshot or type task → press Enter → done.

The app should not feel like Jira, Notion, ClickUp, or Trello. It should feel like a custom personal tool built specifically for fast AI-assisted development work.

The most important principle is:

Capture first. Organize later.

---

## 3. Target User

The primary user is a solo developer, researcher, or AI-assisted builder who works on multiple tech projects at the same time.

The user builds projects phase-by-phase. While working, the user frequently notices bugs, missing features, design problems, UI issues, or enhancement ideas. The user often takes screenshots of the web app and wants to attach those screenshots directly to backlog tasks with minimal friction.

The user wants the flexibility and visual polish of a React/Next.js web app, but also wants desktop-like access from Windows.

---

## 4. Core Problem

Existing project management apps are too slow for this user’s workflow.

The user needs to quickly capture tasks while actively building, testing, and iterating with AI. Any workflow that requires opening a heavy app, creating a full ticket, selecting many fields, manually uploading screenshots, or switching contexts creates too much friction.

The app must make task capture extremely fast, especially screenshot-based task capture.

---

## 5. Product Goals

The MVP should achieve the following:

1. Provide a fast local kanban board for personal project management.
2. Allow text-only task creation in under 3 seconds.
3. Allow screenshot-backed task creation in under 5 seconds.
4. Support multiple projects.
5. Support project phases so the user can build projects phase-by-phase.
6. Allow tasks to include image attachments.
7. Allow drag-and-drop movement of tasks across kanban columns.
8. Run locally on Windows using a Next.js/React web app.
9. Open through a customizable Windows desktop shortcut.
10. Support project-specific desktop shortcuts with custom icons.
11. Store data locally with reliable backup/export.
12. Feel visually polished and highly responsive.

---

## 6. Platform Decision

The app should not be built as an Electron desktop app for the MVP.

Instead, it should be built as a local web app using:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui or custom component system
* SQLite for local data storage
* Local file storage for image attachments
* A lightweight Windows launcher script or helper for opening the app from desktop icons

The app should run on a local server, for example:

http://localhost:3344

The desktop shortcut should launch the local app and open the browser automatically.

---

## 7. Recommended Architecture

### 7.1 Frontend

Use:

* Next.js App Router
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* dnd-kit for drag-and-drop
* Zustand or React Query for state management
* Framer Motion only where it improves smoothness

The UI should feel modern, clean, compact, and fast.

### 7.2 Backend

Use Next.js API routes or server actions for local database operations.

Backend responsibilities:

* Create/update/delete projects
* Create/update/delete phases
* Create/update/delete columns
* Create/update/delete tasks
* Manage task ordering
* Save image attachments
* Generate thumbnails
* Export/import backups
* Generate project-specific shortcut files or helper scripts

### 7.3 Database

Use SQLite stored locally.

Suggested database location:

`C:\Users\<username>\AppData\Local\ProjectFlow\projectflow.db`

### 7.4 Attachment Storage

Store image attachments locally.

Suggested attachment location:

`C:\Users\<username>\AppData\Local\ProjectFlow\attachments\`

Each task can have multiple image attachments.

---

## 8. Desktop Shortcut and Launcher Requirements

This is a core requirement.

The app should be a web app, but the user should be able to open it from the Windows desktop like a normal app.

### 8.1 Main App Shortcut

The installer or setup script should create a desktop shortcut called:

ProjectFlow

Clicking this shortcut should:

1. Check whether the local ProjectFlow server is already running.
2. If not running, start the local Next.js server.
3. Open the app in the user’s browser.
4. Navigate to the last opened project or dashboard.

Preferred behavior:

* Open in Chrome or Edge app mode if available.
* Fallback to default browser if app mode is unavailable.

Example target behavior:

`http://localhost:3344`

Optional app-like browser mode:

`msedge --app=http://localhost:3344`

or

`chrome --app=http://localhost:3344`

This will make the web app feel closer to a desktop app while still keeping it browser-based.

---

## 9. Project-Specific Desktop Shortcuts

The user should be able to create desktop shortcuts for individual projects.

Example:

* Travel Memory App shortcut
* Literature Tracker shortcut
* Personal Finance App shortcut
* AI Coding Dashboard shortcut

Each project shortcut should open directly to that project’s board.

Example URL:

`http://localhost:3344/projects/project-id`

Each project shortcut should have a customizable icon.

### 9.1 Project Icon Customization

Each project should allow the user to set a custom icon.

Supported icon sources:

* Upload PNG
* Upload JPG
* Upload SVG
* Upload ICO
* Choose emoji icon
* Choose from built-in icon set

For Windows desktop shortcuts, the app should generate or use an `.ico` file.

If the user uploads PNG/JPG/SVG, the app should convert or prepare it for shortcut use as an `.ico` file.

Suggested icon storage:

`C:\Users\<username>\AppData\Local\ProjectFlow\icons\projects\<project-id>.ico`

### 9.2 Shortcut Generation

Inside each project settings page, there should be a button:

Create Desktop Shortcut

Clicking it should create a Windows desktop shortcut that:

* Uses the project name as shortcut name
* Uses the project’s custom icon
* Opens the project board directly
* Starts the local server if it is not already running

Important technical note:

A normal browser-only web app cannot directly create Windows `.lnk` shortcuts because browsers do not have permission to modify the desktop. Therefore, the MVP should include a local setup script or lightweight Node/PowerShell helper that handles shortcut creation.

The app can trigger/download a script, but the actual shortcut creation must be handled outside normal browser sandbox restrictions.

Acceptance criteria:

* User can set a custom icon for a project.
* User can create a desktop shortcut for that project.
* Clicking that shortcut opens the correct project board.
* The shortcut has the selected project icon.
* If the local server is not running, the shortcut should start it before opening the browser.

---

## 10. MVP Scope

The MVP should include:

* Local Next.js web app
* Windows launcher script
* Main desktop shortcut
* Project-specific desktop shortcuts
* Custom project icons
* Multiple projects
* Kanban board per project
* Customizable columns
* Fast task creation
* Screenshot/image attachment
* Clipboard image paste
* Drag-and-drop task movement
* Task detail side panel
* Phases
* Tags
* Priority
* Task type
* Search and filters
* Local SQLite storage
* Local image storage
* Backup/export/import
* Dark mode

The MVP should not include:

* Team collaboration
* Cloud sync
* User accounts
* Mobile app
* Public hosting
* Notifications
* Calendar integration
* Time tracking
* Gantt charts
* Complex analytics
* GitHub integration
* AI assistant features

---

## 11. Core User Workflows

## 11.1 Open App from Desktop Icon

The user double-clicks the ProjectFlow desktop icon.

The app should:

1. Start the local server if needed.
2. Open the app in the browser.
3. Show the dashboard or last opened project.
4. Be ready for immediate task entry.

Acceptance criteria:

* User does not need to manually open terminal.
* User does not need to run `npm run dev`.
* App opens from desktop icon.
* App should feel like a regular local application.

---

## 11.2 Open Specific Project from Custom Desktop Icon

The user double-clicks a project-specific desktop icon.

Example:

Travel Memory App

The app should:

1. Start the local server if needed.
2. Open the browser.
3. Navigate directly to that project board.
4. Use the custom desktop icon assigned to that project.

Acceptance criteria:

* Each project can have its own shortcut.
* Each shortcut can have its own icon.
* Shortcut opens the correct project directly.
* The workflow should require no manual server setup.

---

## 11.3 Quick Text Task Creation

Inside any kanban column, the user should see a quick input:

Add task…

The user types a task title and presses Enter.

The task should be created immediately.

Expected behavior:

* No modal opens by default.
* Input remains focused.
* User can add multiple tasks quickly.
* Task appears instantly in the selected column.

Acceptance criteria:

* Text-only task creation takes under 3 seconds.
* User can create multiple tasks without using the mouse.
* Newly created task persists after page refresh.

---

## 11.4 Screenshot Task Creation from Clipboard

The user takes a screenshot using Windows screenshot tools.

Then the user opens the ProjectFlow board and presses Ctrl + V.

The app should detect the clipboard image and create a screenshot-backed task.

Expected flow:

1. User presses Ctrl + V on board.
2. App detects image in clipboard.
3. A small quick-create box appears.
4. User types optional task title.
5. User presses Enter.
6. Task is created with screenshot attached.

If the user does not enter a title, app should use:

Untitled screenshot task

Acceptance criteria:

* User can paste clipboard image directly onto board.
* App creates a task with the image attached.
* Screenshot thumbnail appears on card.
* User does not need to manually upload the image.

---

## 11.5 Drag Image onto Board

The user drags an image file from Windows Explorer onto a kanban column.

The app should create a new task in that column with the image attached.

Acceptance criteria:

* PNG, JPG, JPEG, WEBP, and GIF should be accepted.
* Dragging an image onto a column creates a task.
* Dragging an image onto an existing task attaches it to that task.
* Task card shows an image thumbnail.

---

## 11.6 Drag-and-Drop Kanban

The user should be able to drag tasks between columns.

Expected behavior:

* Tasks can be reordered within a column.
* Tasks can be moved across columns.
* Task status updates automatically based on target column.
* Position is saved immediately.

Acceptance criteria:

* Drag-and-drop works smoothly.
* Reordering persists after refresh.
* App should handle at least 500 tasks per project without feeling slow.

---

## 11.7 Task Detail Side Panel

Clicking a task opens a right-side panel.

The side panel should include:

* Task title
* Description
* Project
* Phase
* Column/status
* Priority
* Task type
* Tags
* Attachments
* Created date
* Updated date
* Optional checklist
* Archive/delete controls

The task detail view should not navigate away from the board.

Acceptance criteria:

* User can edit task details quickly.
* User can paste image into task detail panel.
* User can preview attached images.
* User can delete attachments.
* Closing panel returns user to board exactly where they were.

---

## 12. Project and Phase Management

The app should support multiple projects.

Each project should have:

* Project name
* Description
* Project icon
* Project color
* Project status
* Phases
* Kanban board
* Tasks
* Desktop shortcut status

Project statuses:

* Active
* Paused
* Completed
* Archived

Phases are important because the user builds projects step-by-step.

Example phases:

* Phase 1: MVP
* Phase 2: UI Polish
* Phase 3: Advanced Features
* Phase 4: Monetization
* Phase 5: Maintenance

Each task can optionally belong to a phase.

The board should allow filtering by phase.

Acceptance criteria:

* User can create projects.
* User can set project icon.
* User can create phases.
* User can mark one phase as active.
* User can filter board by active phase.
* User can create a desktop shortcut for a project.

---

## 13. Default Kanban Columns

Every new project should start with these columns:

1. Inbox
2. Backlog
3. Next
4. In Progress
5. Review/Test
6. Done

The user should be able to:

* Rename columns
* Reorder columns
* Add columns
* Delete columns
* Choose default column for quick capture

Acceptance criteria:

* New projects start with default columns.
* Columns are customizable per project.
* If a column is deleted, app asks where to move its existing tasks.

---

## 14. Task Types

Default task types:

* Feature
* Bug
* Enhancement
* UI Fix
* Refactor
* Research
* Idea
* AI Prompt
* Note

Task type should be optional.

Acceptance criteria:

* User can assign task type.
* User can filter by task type.
* Task type appears as a small label on card.

---

## 15. Priority System

Priorities:

* Low
* Medium
* High
* Urgent

Priority should be optional.

Acceptance criteria:

* User can assign priority.
* User can filter by priority.
* Priority is visible on card only when assigned.

---

## 16. Image Attachment Requirements

Image attachments are a core feature.

Supported methods:

1. Paste image from clipboard onto board.
2. Paste image into task detail panel.
3. Drag image file onto board.
4. Drag image file onto existing task.
5. Use file picker.

Supported formats:

* PNG
* JPG
* JPEG
* WEBP
* GIF

Image behavior:

* Store original image locally.
* Generate thumbnail.
* Show thumbnail on card.
* Allow full-screen preview.
* Allow multiple images per task.
* Allow image deletion.
* Lazy-load thumbnails for performance.

Acceptance criteria:

* Every task can have multiple images.
* Image thumbnails load quickly.
* Large screenshots do not freeze the app.
* Attachments survive restart and browser refresh.

---

## 17. Search and Filters

Search should cover:

* Task title
* Description
* Tags
* Task type
* Project name
* Phase name

Filters should include:

* Project
* Phase
* Column
* Priority
* Task type
* Tags
* Has attachment
* Created date
* Updated date

Acceptance criteria:

* Search updates instantly while typing.
* User can search within current project.
* User can search across all projects.
* User can filter tasks that contain screenshots.

---

## 18. Dashboard / Home Screen

The dashboard should be simple and fast.

It should show:

* Active projects
* Project icons
* Current active phase per project
* Tasks in progress
* Recently added tasks
* Recently updated tasks
* Button to create new project
* Button to open last project

Acceptance criteria:

* User can open any project with one click.
* User can see which projects are active.
* User can create a new project quickly.
* Project icons are visible.

---

## 19. UI and Look-and-Feel Requirements

The reason for choosing a web app is UI flexibility. Therefore, the app should feel visually polished.

Design direction:

* Modern React/Next.js interface
* Compact but beautiful kanban board
* Smooth drag-and-drop
* Fast animations, not heavy animations
* Dark mode first
* Good typography
* Clean spacing
* Screenshot thumbnails integrated naturally into cards
* Sidebar for project navigation
* Right-side task details panel
* Command-bar style quick add

Suggested layout:

Left sidebar:

* App logo
* Search
* Project list with icons
* Add project button
* Settings

Main area:

* Project name
* Project phase selector
* Board filters
* Kanban board

Right panel:

* Task details
* Attachments
* Notes
* Metadata

---

## 20. Keyboard Shortcuts

Browser-based app shortcuts should work when the app tab/window is active.

Suggested shortcuts:

* Ctrl + N: New task
* Ctrl + V: Paste screenshot/image
* Ctrl + F: Search
* Esc: Close panel/modal
* Enter: Save quick task
* Delete: Delete selected task after confirmation
* Ctrl + 1/2/3: Switch views if needed

Important limitation:

A pure browser web app cannot reliably register a global Windows shortcut when the browser is not focused. If global quick-add from anywhere in Windows is needed later, it should be added through a small native helper, browser extension, or tray utility in a future version.

For MVP, desktop shortcut access is enough.

---

## 21. Data Model

### Project

Fields:

* id
* name
* description
* icon_path
* icon_type
* color
* status
* last_opened_at
* created_at
* updated_at
* archived_at

### Phase

Fields:

* id
* project_id
* name
* description
* order_index
* status
* is_active
* created_at
* updated_at

### Column

Fields:

* id
* project_id
* name
* order_index
* created_at
* updated_at

### Task

Fields:

* id
* project_id
* phase_id
* column_id
* title
* description
* task_type
* priority
* order_index
* created_at
* updated_at
* archived_at

### Attachment

Fields:

* id
* task_id
* file_name
* file_path
* thumbnail_path
* file_type
* file_size
* width
* height
* created_at

### Tag

Fields:

* id
* name
* color

### TaskTag

Fields:

* task_id
* tag_id

### DesktopShortcut

Fields:

* id
* project_id
* shortcut_name
* shortcut_path
* icon_path
* target_url
* created_at
* updated_at

---

## 22. Local Storage and Backup

The app should be local-first.

Data storage:

* SQLite database for structured data
* Local folder for attachments
* Local folder for project icons
* Local folder for backups

Suggested folder:

`C:\Users\<username>\AppData\Local\ProjectFlow\`

Backup/export should include:

* SQLite database
* Attachments folder
* Icons folder
* Configuration file

Export format:

* ZIP file

Acceptance criteria:

* User can export all data.
* User can import backup.
* Attachments are preserved.
* Project icons are preserved.
* Desktop shortcut settings can be regenerated after import.

---

## 23. Settings

Settings should include:

* Default project
* Default quick-add column
* Default phase behavior
* Theme: Light/Dark/System
* Browser open mode: default browser / Chrome app mode / Edge app mode
* Local server port
* Attachment storage location
* Backup location
* Confirm before delete
* Project shortcut generation settings

Acceptance criteria:

* User can change theme.
* User can change default project.
* User can change server port.
* User can choose browser opening behavior.
* User can regenerate desktop shortcuts.

---

## 24. Installation and Running

The app should include a simple Windows setup flow.

MVP setup can be simple:

1. User downloads or clones the app folder.
2. User runs `setup.bat` or `setup.ps1`.
3. Script installs dependencies if needed.
4. Script creates local data folders.
5. Script creates main desktop shortcut.
6. User opens app from desktop icon.

The user should not need to manually run terminal commands after setup.

Acceptance criteria:

* Setup creates desktop shortcut.
* Shortcut starts local server.
* Shortcut opens app in browser.
* App works after Windows restart.
* User can manually stop/start local server if needed.

---

## 25. Launcher Behavior

The Windows launcher should do the following:

1. Check whether ProjectFlow is already running on the configured port.
2. If running, open the target URL.
3. If not running, start the local server.
4. Wait until the server is available.
5. Open the app in browser/app mode.
6. Avoid opening duplicate server processes.

For project-specific shortcut:

1. Start server if needed.
2. Open project URL directly.
3. Use project-specific icon.

Acceptance criteria:

* No duplicate server instances.
* Shortcut works even after reboot.
* Project shortcut opens the correct board.
* Launcher failure shows a clear error message.

---

## 26. MVP Build Priority

### Version 0.1 — Local Web App Foundation

Build:

* Next.js app
* SQLite connection
* Local data directory
* Dashboard
* Project creation
* Project board
* Default kanban columns
* Basic task creation

### Version 0.2 — Kanban and Task Details

Build:

* Drag-and-drop cards
* Reorder tasks
* Move tasks between columns
* Task detail side panel
* Edit task fields
* Archive/delete task

### Version 0.3 — Screenshot Workflow

Build:

* Paste image from clipboard
* Drag image onto board
* Drag image onto task
* Store attachments locally
* Generate thumbnails
* Image preview modal

### Version 0.4 — Project Icons and Desktop Shortcuts

Build:

* Project icon upload
* Convert/store icons
* Main desktop shortcut
* Project-specific desktop shortcut
* Launcher script
* Open app in browser or app mode

### Version 0.5 — Organization Layer

Build:

* Phases
* Active phase
* Tags
* Priority
* Task type
* Search
* Filters

### Version 0.6 — Backup and Polish

Build:

* Export/import backup
* Settings page
* Dark mode
* Performance optimization
* Error handling
* UI polish

---

## 27. Technical Notes for AI Builder

The app should be designed as a local-first personal tool, not a public SaaS app.

Avoid adding authentication in MVP.

Avoid cloud database services in MVP.

Avoid complex server deployment.

The app should assume it is running on the user’s own Windows machine.

The desktop shortcut requirement needs local OS access, so it should be handled through a setup script, launcher script, or small helper utility. Do not rely on the browser alone to create Windows shortcuts.

For project-specific shortcuts, the best MVP approach is:

* Generate a PowerShell script or Node script that creates `.lnk` files.
* Store project icon as `.ico`.
* Shortcut target should point to the launcher.
* Shortcut arguments should include the project URL or project ID.

Example shortcut concept:

Target:

`ProjectFlowLauncher.exe --project project-id`

or

`powershell.exe -ExecutionPolicy Bypass -File StartProjectFlow.ps1 -ProjectId project-id`

The launcher then opens:

`http://localhost:3344/projects/project-id`

---

## 28. Success Criteria

The MVP is successful if:

1. User can open the app from a desktop icon.
2. User can create project-specific desktop icons.
3. User can customize each project’s icon.
4. User can open a specific project directly from its icon.
5. User can create a normal task in under 3 seconds.
6. User can create a screenshot-backed task in under 5 seconds.
7. User can manage multiple projects without confusion.
8. User can organize work phase-by-phase.
9. User prefers this app over Trello, Notion, Jira, or ClickUp for personal backlog management.
10. The app feels like a fast custom tool, not a generic project management platform.

---

## 29. Most Important UX Rule

The user should never feel that they are “maintaining a project management system.”

They should feel that they are instantly capturing useful work items while building.

The default flow should always be:

Open project → type task or paste screenshot → press Enter → continue working.
