# ProjectFlow

Fast local kanban for AI-assisted tech projects.

## Run Locally

```powershell
npm install
npm run build
npm run start
```

Open:

```text
http://127.0.0.1:3344
```

## Windows Setup

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File setup.ps1
```

The setup script installs dependencies, builds the app, creates local data folders under
`%LOCALAPPDATA%\ProjectFlow`, and creates a `ProjectFlow` desktop shortcut.

## Local Data

ProjectFlow stores its SQLite database, attachments, icons, logs, and backups in:

```text
%LOCALAPPDATA%\ProjectFlow
```

For development-only isolated data, set:

```powershell
$env:PROJECTFLOW_DATA_DIR = "C:\tmp\ProjectFlow"
```

## Shortcuts

The app includes:

- `scripts\Start-ProjectFlow.ps1` to start the local server and open the browser.
- `scripts\Create-ProjectFlowShortcut.ps1` to create main and project-specific Windows shortcuts.
- In-app shortcut creation from project settings.
