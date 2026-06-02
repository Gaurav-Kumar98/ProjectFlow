export type ProjectStatus = "Active" | "Paused" | "Completed" | "Archived";
export type PhaseStatus = "Planned" | "Active" | "Completed" | "Archived";
export type Priority = "" | "Low" | "Medium" | "High" | "Urgent";
export type TaskType =
  | ""
  | "Feature"
  | "Bug"
  | "Enhancement"
  | "UI Fix"
  | "Refactor"
  | "Research"
  | "Idea"
  | "AI Prompt"
  | "Note";

export type IconType = "letter" | "emoji" | "built_in" | "upload";
export type ThemeSetting = "dark" | "light" | "system";
export type BrowserOpenMode = "default" | "edge-app" | "chrome-app";

export interface Project {
  id: string;
  name: string;
  description: string;
  iconPath: string | null;
  iconType: IconType;
  iconValue: string | null;
  color: string;
  status: ProjectStatus;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  orderIndex: number;
  status: PhaseStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  phaseId: string | null;
  columnId: string;
  title: string;
  description: string;
  notes: string;
  taskType: TaskType;
  priority: Priority;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  tags: Tag[];
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  filePath: string;
  thumbnailPath: string | null;
  fileType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  defaultProjectId: string | null;
  defaultQuickAddColumnId: string | null;
  defaultPhaseBehavior: "active" | "none";
  theme: ThemeSetting;
  browserOpenMode: BrowserOpenMode;
  localServerPort: number;
  attachmentStorageLocation: string;
  backupLocation: string;
  confirmBeforeDelete: boolean;
  geminiApiKey: string | null;
}

export interface AppState {
  projects: Project[];
  phases: Phase[];
  columns: BoardColumn[];
  tasks: Task[];
  tags: Tag[];
  settings: Settings;
  dataRoot: string;
}

export interface TaskOrderUpdate {
  taskId: string;
  columnId: string;
  orderIndex: number;
}
