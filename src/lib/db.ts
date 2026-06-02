import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  AppState,
  Attachment,
  BoardColumn,
  BrowserOpenMode,
  IconType,
  Phase,
  PhaseStatus,
  Priority,
  Project,
  ProjectStatus,
  Settings,
  Tag,
  Task,
  TaskOrderUpdate,
  TaskType,
  ThemeSetting
} from "@/lib/types";

type Row = Record<string, unknown>;

let dbInstance: DatabaseSync | null = null;
let initialized = false;

const DEFAULT_COLUMNS = [
  "Inbox",
  "Backlog",
  "Next",
  "In Progress",
  "Review/Test",
  "Done"
];

const DEFAULT_TASK_TYPES: TaskType[] = [
  "Feature",
  "Bug",
  "Enhancement",
  "UI Fix",
  "Refactor",
  "Research",
  "Idea",
  "AI Prompt",
  "Note"
];

const TAG_COLORS = [
  "#22c55e",
  "#38bdf8",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#14b8a6",
  "#f97316"
];

export function id() {
  return randomUUID();
}

export function now() {
  return new Date().toISOString();
}

export function getDataRoot() {
  return (
    process.env.PROJECTFLOW_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || process.cwd(), "ProjectFlow")
  );
}

export function getAttachmentRoot() {
  return path.join(getDataRoot(), "attachments");
}

export function getIconRoot() {
  return path.join(getDataRoot(), "icons");
}

export function getBackupRoot() {
  return path.join(getDataRoot(), "backups");
}

export function getLogRoot() {
  return path.join(getDataRoot(), "logs");
}

export function getDatabasePath() {
  return path.join(getDataRoot(), "projectflow.db");
}

export function ensureDataDirs() {
  [
    getDataRoot(),
    getAttachmentRoot(),
    getIconRoot(),
    path.join(getIconRoot(), "projects"),
    getBackupRoot(),
    getLogRoot()
  ].forEach((dir) => mkdirSync(dir, { recursive: true }));
}

export function getDb() {
  ensureDataDirs();

  if (!dbInstance) {
    dbInstance = new DatabaseSync(getDatabasePath());
  }

  if (!initialized) {
    initializeDatabase(dbInstance);
    initialized = true;
  }

  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    initialized = false;
  }
}

function initializeDatabase(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon_path TEXT,
      icon_type TEXT NOT NULL DEFAULT 'letter',
      icon_value TEXT,
      color TEXT NOT NULL DEFAULT '#38bdf8',
      status TEXT NOT NULL DEFAULT 'Active',
      last_opened_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Planned',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL,
      column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      task_type TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project_column ON tasks(project_id, column_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
  `);

  const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as Row[];
  if (!taskColumns.some(col => col.name === 'notes')) {
    db.exec("ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }

  ensureDefaultSettings(db);

  const count = db.prepare("SELECT COUNT(*) as count FROM projects").get() as Row;
  if (Number(count.count || 0) === 0) {
    seedInitialProject(db);
  }
}

function ensureDefaultSettings(db: DatabaseSync) {
  const defaults: Record<keyof Settings, string> = {
    defaultProjectId: "",
    defaultQuickAddColumnId: "",
    defaultPhaseBehavior: "active",
    theme: "dark",
    browserOpenMode: "edge-app",
    localServerPort: "3344",
    attachmentStorageLocation: getAttachmentRoot(),
    backupLocation: getBackupRoot(),
    confirmBeforeDelete: "true",
    geminiApiKey: ""
  };

  const statement = db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)"
  );

  Object.entries(defaults).forEach(([key, value]) => statement.run(key, value));
}

function seedInitialProject(db: DatabaseSync) {
  const projectId = id();
  const phase1 = id();
  const phase2 = id();
  const phase3 = id();
  const stamp = now();

  db.prepare(`
    INSERT INTO projects (
      id, name, description, icon_type, icon_value, color, status,
      last_opened_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    "ProjectFlow",
    "A fast local kanban board for AI-assisted tech projects.",
    "letter",
    "PF",
    "#38bdf8",
    "Active",
    stamp,
    stamp,
    stamp
  );

  [
    [phase1, "Phase 1: MVP", "Local web app foundation.", 1000, "Active", 1],
    [phase2, "Phase 2: UI Polish", "Refine the fast capture workflow.", 2000, "Planned", 0],
    [phase3, "Phase 3: Advanced Features", "Backups, shortcuts, and deeper organization.", 3000, "Planned", 0]
  ].forEach(([phaseId, name, description, orderIndex, status, isActive]) => {
    db.prepare(`
      INSERT INTO phases (
        id, project_id, name, description, order_index, status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(phaseId, projectId, name, description, orderIndex, status, isActive, stamp, stamp);
  });

  const columnIds = DEFAULT_COLUMNS.map((columnName, index) => {
    const columnId = id();
    db.prepare(`
      INSERT INTO columns (id, project_id, name, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(columnId, projectId, columnName, (index + 1) * 1000, stamp, stamp);
    return { id: columnId, name: columnName };
  });

  const taskSeeds: Array<[string, string, TaskType, Priority]> = [
    ["Create the first real local task in under three seconds", "Inbox", "Feature", "High"],
    ["Paste a screenshot and turn it into a card", "Inbox", "Feature", "High"],
    ["Move cards across the kanban board with drag and drop", "Next", "Feature", "High"],
    ["Use phases to keep MVP work separate from polish work", "Backlog", "Enhancement", "Medium"],
    ["Create project-specific desktop shortcuts", "Backlog", "Feature", "Urgent"],
    ["Export a local backup with database and attachments", "Backlog", "Feature", "Medium"]
  ];

  taskSeeds.forEach(([title, columnName, taskType, priority], index) => {
    const column = columnIds.find((item) => item.name === columnName) || columnIds[0];
    db.prepare(`
      INSERT INTO tasks (
        id, project_id, phase_id, column_id, title, description, notes, task_type, priority,
        order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id(),
      projectId,
      phase1,
      column.id,
      title,
      "",
      "",
      taskType,
      priority,
      (index + 1) * 1000,
      stamp,
      stamp
    );
  });

  db.prepare("UPDATE app_settings SET value = ? WHERE key = 'defaultProjectId'").run(projectId);
  db.prepare("UPDATE app_settings SET value = ? WHERE key = 'defaultQuickAddColumnId'").run(
    columnIds[0]?.id || ""
  );
}

function boolValue(value: unknown) {
  return value === 1 || value === "1" || value === true || value === "true";
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value || fallback);
}

function projectFromRow(row: Row): Project {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    description: stringValue(row.description),
    iconPath: stringValue(row.icon_path) || null,
    iconType: (stringValue(row.icon_type, "letter") as IconType) || "letter",
    iconValue: stringValue(row.icon_value) || null,
    color: stringValue(row.color, "#38bdf8"),
    status: (stringValue(row.status, "Active") as ProjectStatus) || "Active",
    lastOpenedAt: stringValue(row.last_opened_at) || null,
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    archivedAt: stringValue(row.archived_at) || null
  };
}

function phaseFromRow(row: Row): Phase {
  return {
    id: stringValue(row.id),
    projectId: stringValue(row.project_id),
    name: stringValue(row.name),
    description: stringValue(row.description),
    orderIndex: numberValue(row.order_index),
    status: (stringValue(row.status, "Planned") as PhaseStatus) || "Planned",
    isActive: boolValue(row.is_active),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

function columnFromRow(row: Row): BoardColumn {
  return {
    id: stringValue(row.id),
    projectId: stringValue(row.project_id),
    name: stringValue(row.name),
    orderIndex: numberValue(row.order_index),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

function tagFromRow(row: Row): Tag {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    color: stringValue(row.color, "#38bdf8")
  };
}

function attachmentFromRow(row: Row): Attachment {
  const attachmentId = stringValue(row.id);
  return {
    id: attachmentId,
    taskId: stringValue(row.task_id),
    fileName: stringValue(row.file_name),
    filePath: stringValue(row.file_path),
    thumbnailPath: stringValue(row.thumbnail_path) || null,
    fileType: stringValue(row.file_type),
    fileSize: numberValue(row.file_size),
    width: row.width === null || row.width === undefined ? null : numberValue(row.width),
    height: row.height === null || row.height === undefined ? null : numberValue(row.height),
    createdAt: stringValue(row.created_at),
    url: `/api/files/attachments/${attachmentId}`
  };
}

function taskFromRow(row: Row, tags: Tag[], attachments: Attachment[]): Task {
  return {
    id: stringValue(row.id),
    projectId: stringValue(row.project_id),
    phaseId: stringValue(row.phase_id) || null,
    columnId: stringValue(row.column_id),
    title: stringValue(row.title),
    description: stringValue(row.description),
    notes: stringValue(row.notes),
    taskType: (stringValue(row.task_type) as TaskType) || "",
    priority: (stringValue(row.priority) as Priority) || "",
    orderIndex: numberValue(row.order_index),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    archivedAt: stringValue(row.archived_at) || null,
    tags,
    attachments
  };
}

function getSettingsFromDb(db: DatabaseSync): Settings {
  const rows = db.prepare("SELECT key, value FROM app_settings").all() as Row[];
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<
    string,
    string
  >;

  return {
    defaultProjectId: values.defaultProjectId || null,
    defaultQuickAddColumnId: values.defaultQuickAddColumnId || null,
    defaultPhaseBehavior: values.defaultPhaseBehavior === "none" ? "none" : "active",
    theme: ((values.theme || "dark") as ThemeSetting) || "dark",
    browserOpenMode: ((values.browserOpenMode || "edge-app") as BrowserOpenMode) || "edge-app",
    localServerPort: Number(values.localServerPort || 3344),
    attachmentStorageLocation: values.attachmentStorageLocation || getAttachmentRoot(),
    backupLocation: values.backupLocation || getBackupRoot(),
    confirmBeforeDelete: values.confirmBeforeDelete !== "false",
    geminiApiKey: values.geminiApiKey || null
  };
}

export function getSettings() {
  return getSettingsFromDb(getDb());
}

export function updateSettings(patch: Partial<Settings>) {
  const db = getDb();
  const existing = getSettingsFromDb(db);
  const next: Settings = { ...existing, ...patch };
  const statement = db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)");

  Object.entries({
    defaultProjectId: next.defaultProjectId || "",
    defaultQuickAddColumnId: next.defaultQuickAddColumnId || "",
    defaultPhaseBehavior: next.defaultPhaseBehavior,
    theme: next.theme,
    browserOpenMode: next.browserOpenMode,
    localServerPort: String(next.localServerPort || 3344),
    attachmentStorageLocation: next.attachmentStorageLocation || getAttachmentRoot(),
    backupLocation: next.backupLocation || getBackupRoot(),
    confirmBeforeDelete: String(next.confirmBeforeDelete),
    geminiApiKey: next.geminiApiKey || ""
  }).forEach(([key, value]) => statement.run(key, value));

  return getSettingsFromDb(db);
}

export function getAppState(): AppState {
  const db = getDb();
  const projects = (db
    .prepare("SELECT * FROM projects ORDER BY status = 'Archived', last_opened_at DESC, name ASC")
    .all() as Row[]).map(projectFromRow);

  const phases = (db
    .prepare("SELECT * FROM phases ORDER BY project_id, order_index ASC")
    .all() as Row[]).map(phaseFromRow);

  const columns = (db
    .prepare("SELECT * FROM columns ORDER BY project_id, order_index ASC")
    .all() as Row[]).map(columnFromRow);

  const tags = (db.prepare("SELECT * FROM tags ORDER BY name ASC").all() as Row[]).map(tagFromRow);
  const tagRows = db
    .prepare(
      `SELECT task_tags.task_id, tags.id, tags.name, tags.color
       FROM task_tags
       JOIN tags ON tags.id = task_tags.tag_id
       ORDER BY tags.name ASC`
    )
    .all() as Row[];
  const attachmentRows = db
    .prepare("SELECT * FROM attachments ORDER BY created_at ASC")
    .all() as Row[];

  const tagsByTask = new Map<string, Tag[]>();
  tagRows.forEach((row) => {
    const taskId = stringValue(row.task_id);
    tagsByTask.set(taskId, [...(tagsByTask.get(taskId) || []), tagFromRow(row)]);
  });

  const attachmentsByTask = new Map<string, Attachment[]>();
  attachmentRows.forEach((row) => {
    const attachment = attachmentFromRow(row);
    attachmentsByTask.set(attachment.taskId, [
      ...(attachmentsByTask.get(attachment.taskId) || []),
      attachment
    ]);
  });

  const tasks = (db
    .prepare("SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY column_id, order_index ASC")
    .all() as Row[]).map((row) => {
    const taskId = stringValue(row.id);
    return taskFromRow(row, tagsByTask.get(taskId) || [], attachmentsByTask.get(taskId) || []);
  });

  return {
    projects,
    phases,
    columns,
    tasks,
    tags,
    settings: getSettingsFromDb(db),
    dataRoot: getDataRoot()
  };
}

export function markProjectOpened(projectId: string) {
  getDb()
    .prepare("UPDATE projects SET last_opened_at = ?, updated_at = ? WHERE id = ?")
    .run(now(), now(), projectId);
}

export function getProject(projectId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Row | undefined;
  if (!row) return null;
  return projectFromRow(row);
}

export function createProject(input: {
  name: string;
  description?: string;
  iconType?: IconType;
  iconValue?: string | null;
  iconPath?: string | null;
  color?: string;
}) {
  const db = getDb();
  const projectId = id();
  const stamp = now();
  const name = input.name.trim() || "Untitled Project";

  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO projects (
        id, name, description, icon_path, icon_type, icon_value, color, status,
        last_opened_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      name,
      input.description?.trim() || "",
      input.iconPath || null,
      input.iconType || "letter",
      input.iconValue || initialsForProject(name),
      input.color || pickProjectColor(name),
      "Active",
      stamp,
      stamp,
      stamp
    );

    const phaseId = id();
    db.prepare(`
      INSERT INTO phases (
        id, project_id, name, description, order_index, status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(phaseId, projectId, "Phase 1: MVP", "", 1000, "Active", 1, stamp, stamp);

    const columnIds = DEFAULT_COLUMNS.map((name, index) => {
      const columnId = id();
      db.prepare(`
        INSERT INTO columns (id, project_id, name, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(columnId, projectId, name, (index + 1) * 1000, stamp, stamp);
      return columnId;
    });

    db.prepare("UPDATE app_settings SET value = ? WHERE key = 'defaultProjectId'").run(projectId);
    db.prepare("UPDATE app_settings SET value = ? WHERE key = 'defaultQuickAddColumnId'").run(
      columnIds[0] || ""
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getProject(projectId);
}

export function updateProject(
  projectId: string,
  patch: Partial<
    Pick<
      Project,
      "name" | "description" | "iconType" | "iconValue" | "iconPath" | "color" | "status"
    >
  >
) {
  const existing = getProject(projectId);
  if (!existing) throw new Error("Project not found");

  getDb()
    .prepare(`
      UPDATE projects
      SET name = ?, description = ?, icon_path = ?, icon_type = ?, icon_value = ?,
          color = ?, status = ?, archived_at = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(
      patch.name?.trim() || existing.name,
      patch.description ?? existing.description,
      patch.iconPath === undefined ? existing.iconPath : patch.iconPath,
      patch.iconType || existing.iconType,
      patch.iconValue === undefined ? existing.iconValue : patch.iconValue,
      patch.color || existing.color,
      patch.status || existing.status,
      patch.status === "Archived" ? now() : existing.archivedAt,
      now(),
      projectId
    );

  return getProject(projectId);
}

export function createPhase(input: {
  projectId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}) {
  const db = getDb();
  const stamp = now();
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(order_index), 0) + 1000 as nextOrder FROM phases WHERE project_id = ?")
    .get(input.projectId) as Row;
  const phaseId = id();

  db.exec("BEGIN");
  try {
    if (input.isActive) {
      db.prepare("UPDATE phases SET is_active = 0, status = 'Planned' WHERE project_id = ?").run(
        input.projectId
      );
    }

    db.prepare(`
      INSERT INTO phases (
        id, project_id, name, description, order_index, status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      phaseId,
      input.projectId,
      input.name.trim() || "New Phase",
      input.description?.trim() || "",
      Number(orderRow.nextOrder || 1000),
      input.isActive ? "Active" : "Planned",
      input.isActive ? 1 : 0,
      stamp,
      stamp
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return phaseId;
}

export function updatePhase(
  phaseId: string,
  patch: Partial<Pick<Phase, "name" | "description" | "status" | "isActive" | "orderIndex">>
) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM phases WHERE id = ?").get(phaseId) as Row | undefined;
  if (!existing) throw new Error("Phase not found");

  db.exec("BEGIN");
  try {
    if (patch.isActive) {
      db.prepare("UPDATE phases SET is_active = 0, status = 'Planned' WHERE project_id = ?").run(
        stringValue(existing.project_id)
      );
    }

    db.prepare(`
      UPDATE phases
      SET name = ?, description = ?, order_index = ?, status = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      patch.name?.trim() || stringValue(existing.name),
      patch.description ?? stringValue(existing.description),
      patch.orderIndex ?? numberValue(existing.order_index),
      patch.isActive ? "Active" : patch.status || stringValue(existing.status),
      patch.isActive === undefined ? numberValue(existing.is_active) : patch.isActive ? 1 : 0,
      now(),
      phaseId
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createColumn(projectId: string, name: string) {
  const db = getDb();
  const stamp = now();
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(order_index), 0) + 1000 as nextOrder FROM columns WHERE project_id = ?")
    .get(projectId) as Row;
  const columnId = id();

  db.prepare(`
    INSERT INTO columns (id, project_id, name, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(columnId, projectId, name.trim() || "New Column", Number(orderRow.nextOrder || 1000), stamp, stamp);

  return columnId;
}

export function updateColumn(
  columnId: string,
  patch: Partial<Pick<BoardColumn, "name" | "orderIndex">>
) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM columns WHERE id = ?").get(columnId) as Row | undefined;
  if (!existing) throw new Error("Column not found");

  db.prepare("UPDATE columns SET name = ?, order_index = ?, updated_at = ? WHERE id = ?").run(
    patch.name?.trim() || stringValue(existing.name),
    patch.orderIndex ?? numberValue(existing.order_index),
    now(),
    columnId
  );
}

export function deleteColumn(columnId: string, moveToColumnId?: string) {
  const db = getDb();
  const column = db.prepare("SELECT * FROM columns WHERE id = ?").get(columnId) as Row | undefined;
  if (!column) return;

  const fallback = db
    .prepare("SELECT id FROM columns WHERE project_id = ? AND id != ? ORDER BY order_index LIMIT 1")
    .get(stringValue(column.project_id), columnId) as Row | undefined;
  const target = moveToColumnId || stringValue(fallback?.id);
  if (!target) throw new Error("Cannot delete the only column in a project");

  db.exec("BEGIN");
  try {
    db.prepare("UPDATE tasks SET column_id = ?, updated_at = ? WHERE column_id = ?").run(
      target,
      now(),
      columnId
    );
    db.prepare("DELETE FROM columns WHERE id = ?").run(columnId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createTask(input: {
  projectId: string;
  columnId?: string | null;
  phaseId?: string | null;
  title: string;
  description?: string;
  notes?: string;
  taskType?: TaskType;
  priority?: Priority;
  tags?: string[];
}) {
  const db = getDb();
  const stamp = now();
  const columnId = input.columnId || getDefaultColumnId(input.projectId);
  const phaseId = input.phaseId === undefined ? getActivePhaseId(input.projectId) : input.phaseId;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(order_index), 0) + 1000 as nextOrder FROM tasks WHERE column_id = ?")
    .get(columnId) as Row;
  const taskId = id();

  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO tasks (
        id, project_id, phase_id, column_id, title, description, notes, task_type, priority,
        order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      input.projectId,
      phaseId || null,
      columnId,
      input.title.trim() || "Untitled task",
      input.description?.trim() || "",
      input.notes?.trim() || "",
      input.taskType || "",
      input.priority || "",
      Number(orderRow.nextOrder || 1000),
      stamp,
      stamp
    );

    syncTaskTags(db, taskId, input.tags || []);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return taskId;
}

export function updateTask(
  taskId: string,
  patch: Partial<
    Pick<Task, "title" | "description" | "notes" | "phaseId" | "columnId" | "taskType" | "priority"> & {
      tags: string[];
    }
  >
) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Row | undefined;
  if (!existing) throw new Error("Task not found");

  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, notes = ?, phase_id = ?, column_id = ?, task_type = ?,
          priority = ?, updated_at = ?
      WHERE id = ?
    `).run(
      patch.title?.trim() || stringValue(existing.title),
      patch.description ?? stringValue(existing.description),
      patch.notes ?? stringValue(existing.notes),
      patch.phaseId === undefined ? stringValue(existing.phase_id) || null : patch.phaseId || null,
      patch.columnId || stringValue(existing.column_id),
      patch.taskType === undefined ? stringValue(existing.task_type) : patch.taskType,
      patch.priority === undefined ? stringValue(existing.priority) : patch.priority,
      now(),
      taskId
    );

    if (patch.tags) {
      syncTaskTags(db, taskId, patch.tags);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function archiveTask(taskId: string) {
  getDb()
    .prepare("UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?")
    .run(now(), now(), taskId);
}

export function restoreTasks(taskIds: string[]) {
  const db = getDb();
  const stamp = now();
  db.exec("BEGIN");
  try {
    const statement = db.prepare("UPDATE tasks SET archived_at = NULL, updated_at = ? WHERE id = ?");
    taskIds.forEach((id) => statement.run(stamp, id));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function reorderTasks(updates: TaskOrderUpdate[]) {
  const db = getDb();
  const stamp = now();

  db.exec("BEGIN");
  try {
    const statement = db.prepare(
      "UPDATE tasks SET column_id = ?, order_index = ?, updated_at = ? WHERE id = ?"
    );
    updates.forEach((update) =>
      statement.run(update.columnId, update.orderIndex, stamp, update.taskId)
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function recordAttachment(input: {
  taskId: string;
  fileName: string;
  filePath: string;
  thumbnailPath?: string | null;
  fileType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
}) {
  const attachmentId = id();
  getDb()
    .prepare(`
      INSERT INTO attachments (
        id, task_id, file_name, file_path, thumbnail_path, file_type, file_size,
        width, height, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      attachmentId,
      input.taskId,
      input.fileName,
      input.filePath,
      input.thumbnailPath || input.filePath,
      input.fileType,
      input.fileSize,
      input.width || null,
      input.height || null,
      now()
    );
  return attachmentId;
}

export function getAttachment(attachmentId: string) {
  const row = getDb()
    .prepare("SELECT * FROM attachments WHERE id = ?")
    .get(attachmentId) as Row | undefined;
  return row ? attachmentFromRow(row) : null;
}

export function deleteAttachment(attachmentId: string) {
  const attachment = getAttachment(attachmentId);
  if (!attachment) return;

  const resolved = path.resolve(attachment.filePath);
  if (resolved.startsWith(path.resolve(getAttachmentRoot())) && existsSync(resolved)) {
    rmSync(resolved, { force: true });
  }
  getDb().prepare("DELETE FROM attachments WHERE id = ?").run(attachmentId);
}

export function saveShortcutRecord(input: {
  projectId?: string | null;
  shortcutName: string;
  shortcutPath: string;
  iconPath?: string | null;
  targetUrl: string;
}) {
  const existing = input.projectId
    ? (getDb()
        .prepare("SELECT id FROM desktop_shortcuts WHERE project_id = ? LIMIT 1")
        .get(input.projectId) as Row | undefined)
    : null;
  const stamp = now();
  const shortcutId = stringValue(existing?.id) || id();

  getDb()
    .prepare(`
      INSERT OR REPLACE INTO desktop_shortcuts (
        id, project_id, shortcut_name, shortcut_path, icon_path, target_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM desktop_shortcuts WHERE id = ?), ?), ?)
    `)
    .run(
      shortcutId,
      input.projectId || null,
      input.shortcutName,
      input.shortcutPath,
      input.iconPath || null,
      input.targetUrl,
      shortcutId,
      stamp,
      stamp
    );

  return shortcutId;
}

export function saveUploadedProjectIcon(input: {
  projectId: string;
  fileName: string;
  fileType: string;
  buffer: Buffer;
}) {
  const extension = extensionForFile(input.fileName, input.fileType);
  const dir = path.join(getIconRoot(), "projects", input.projectId);
  mkdirSync(dir, { recursive: true });
  const destination = path.join(dir, `source.${extension}`);
  writeFileSync(destination, input.buffer);
  updateProject(input.projectId, {
    iconType: "upload",
    iconPath: destination,
    iconValue: input.fileName
  });
  return destination;
}

export function safeAttachmentPath(taskId: string, originalName: string, fileType: string) {
  const extension = extensionForFile(originalName, fileType);
  const dir = path.join(getAttachmentRoot(), taskId);
  mkdirSync(dir, { recursive: true });
  return path.join(dir, `${id()}.${extension}`);
}

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 140) || "attachment";
}

export function extensionForFile(fileName: string, fileType: string) {
  const cleanName = sanitizeFileName(fileName);
  const ext = path.extname(cleanName).replace(".", "").toLowerCase();
  if (ext) return ext;
  if (fileType.includes("png")) return "png";
  if (fileType.includes("jpeg") || fileType.includes("jpg")) return "jpg";
  if (fileType.includes("webp")) return "webp";
  if (fileType.includes("gif")) return "gif";
  if (fileType.includes("svg")) return "svg";
  if (fileType.includes("icon") || fileType.includes("ico")) return "ico";
  return "bin";
}

export function isSupportedImage(fileName: string, fileType: string) {
  const ext = extensionForFile(fileName, fileType);
  return ["png", "jpg", "jpeg", "webp", "gif", "svg", "ico"].includes(ext);
}

export function resolveInsideDataRoot(filePath: string) {
  const resolved = path.resolve(filePath);
  const root = path.resolve(getDataRoot());
  if (!resolved.startsWith(root)) {
    throw new Error("File path is outside ProjectFlow data directory");
  }
  return resolved;
}

export function fileBufferInsideDataRoot(filePath: string) {
  const resolved = resolveInsideDataRoot(filePath);
  return {
    buffer: readFileSync(resolved),
    size: statSync(resolved).size
  };
}

function getDefaultColumnId(projectId: string) {
  const settings = getSettings();
  const db = getDb();
  if (settings.defaultQuickAddColumnId) {
    const row = db
      .prepare("SELECT id FROM columns WHERE id = ? AND project_id = ?")
      .get(settings.defaultQuickAddColumnId, projectId) as Row | undefined;
    if (row) return stringValue(row.id);
  }

  const row = db
    .prepare("SELECT id FROM columns WHERE project_id = ? ORDER BY order_index ASC LIMIT 1")
    .get(projectId) as Row | undefined;
  if (!row) throw new Error("Project has no columns");
  return stringValue(row.id);
}

function getActivePhaseId(projectId: string) {
  const settings = getSettings();
  if (settings.defaultPhaseBehavior === "none") return null;

  const row = getDb()
    .prepare("SELECT id FROM phases WHERE project_id = ? AND is_active = 1 LIMIT 1")
    .get(projectId) as Row | undefined;
  return stringValue(row?.id) || null;
}

function syncTaskTags(db: DatabaseSync, taskId: string, rawNames: string[]) {
  const names = Array.from(
    new Set(rawNames.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  ).slice(0, 12);

  db.prepare("DELETE FROM task_tags WHERE task_id = ?").run(taskId);

  names.forEach((name) => {
    const existing = db.prepare("SELECT * FROM tags WHERE lower(name) = lower(?)").get(name) as
      | Row
      | undefined;
    const tagId = stringValue(existing?.id) || id();
    if (!existing) {
      db.prepare("INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)").run(
        tagId,
        name,
        TAG_COLORS[Math.abs(hash(name)) % TAG_COLORS.length],
        now()
      );
    }
    db.prepare("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)").run(
      taskId,
      tagId
    );
  });
}

function pickProjectColor(value: string) {
  const palette = ["#38bdf8", "#22c55e", "#f59e0b", "#fb7185", "#a78bfa", "#14b8a6"];
  return palette[Math.abs(hash(value)) % palette.length];
}

function initialsForProject(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = words.map((word) => word[0]?.toUpperCase()).join("");
  return initials || "PF";
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return result;
}

export const appConstants = {
  defaultColumns: DEFAULT_COLUMNS,
  defaultTaskTypes: DEFAULT_TASK_TYPES
};
