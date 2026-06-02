"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import {
  Anchor,
  Archive,
  Bike,
  Book,
  Box,
  Briefcase,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Cloud,
  Code,
  Coffee,
  Columns3,
  Compass,
  Cpu,
  Database,
  Download,
  Filter,
  Flag,
  FolderKanban,
  Gamepad2,
  Globe,
  Hammer,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  Layout,
  Lightbulb,
  Map,
  MonitorUp,
  Moon,
  Music,
  Palette,
  PanelRight,
  PenTool,
  Plane,
  Plus,
  Puzzle,
  Rocket,
  Save,
  Search,
  Server,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Target,
  Terminal,
  Trash2,
  Upload,
  Video,
  X,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type {
  AppState,
  Attachment,
  BoardColumn,
  BrowserOpenMode,
  Phase,
  Priority,
  Project,
  ProjectStatus,
  Task,
  TaskOrderUpdate,
  TaskType,
  ThemeSetting
} from "@/lib/types";

const TASK_TYPES: TaskType[] = [
  "",
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

const PRIORITIES: Priority[] = ["", "Low", "Medium", "High", "Urgent"];
const PROJECT_STATUSES: ProjectStatus[] = ["Active", "Paused", "Completed", "Archived"];
const THEMES: ThemeSetting[] = ["dark", "light", "system"];
const OPEN_MODES: BrowserOpenMode[] = ["edge-app", "chrome-app", "default"];

type RightPanel = "task" | "project" | "settings" | null;

const BUILT_IN_ICONS: Record<string, React.ElementType> = {
  FolderKanban, Layers, Zap, Rocket, Star, Heart,
  Briefcase, Code, Terminal, Globe, Cpu, Database,
  Smartphone, Gamepad2, Coffee, Music, Camera, Palette,
  Box, Target, Lightbulb, Hammer, Cloud, Book,
  Anchor, Bike, Car, Plane, Compass, Map, Flag,
  Layout, Puzzle, PenTool, Server, Video
};

type Filters = {
  query: string;
  phaseId: string;
  priority: Priority | "all";
  taskType: TaskType | "all";
  hasAttachment: "all" | "yes" | "no";
};

type PendingUpload = {
  files: File[];
  urls: string[];
  columnId: string | null;
};

export function ProjectFlowApp({ initialProjectId }: { initialProjectId?: string }) {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId || null
  );
  const [showHome, setShowHome] = useState(!initialProjectId);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  type UndoAction = 
    | { type: "DELETE_TASKS"; taskIds: string[] }
    | { type: "MOVE_TASKS"; previousUpdates: TaskOrderUpdate[] };
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [filters, setFilters] = useState<Filters>({
    query: "",
    phaseId: "active",
    priority: "all",
    taskType: "all",
    hasAttachment: "all"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const [activeOverId, setActiveOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const projects = state?.projects ?? [];
  const phases = state?.phases ?? [];
  const columns = state?.columns ?? [];
  const tasks = state?.tasks ?? [];
  const activeProject = projects.find((project) => project.id === selectedProjectId) || null;
  const projectPhases = useMemo(
    () =>
      activeProject
        ? phases
            .filter((phase) => phase.projectId === activeProject.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [activeProject, phases]
  );
  const activePhase = projectPhases.find((phase) => phase.isActive) || null;
  const projectColumns = useMemo(
    () =>
      activeProject
        ? columns
            .filter((column) => column.projectId === activeProject.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [activeProject, columns]
  );
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const activeDragTask = tasks.find((task) => task.id === activeDragTaskId) || null;

  const filteredTasks = useMemo(() => {
    if (!activeProject) return [];

    const query = filters.query.trim().toLowerCase();
    return tasks
      .filter((task) => task.projectId === activeProject.id)
      .filter((task) => {
        if (filters.phaseId === "active" && activePhase) return task.phaseId === activePhase.id;
        if (filters.phaseId === "none") return !task.phaseId;
        if (filters.phaseId !== "all" && filters.phaseId !== "active") {
          return task.phaseId === filters.phaseId;
        }
        return true;
      })
      .filter((task) => (filters.priority === "all" ? true : task.priority === filters.priority))
      .filter((task) => (filters.taskType === "all" ? true : task.taskType === filters.taskType))
      .filter((task) => {
        if (filters.hasAttachment === "all") return true;
        return filters.hasAttachment === "yes"
          ? task.attachments.length > 0
          : task.attachments.length === 0;
      })
      .filter((task) => {
        if (!query) return true;
        const phase = phases.find((item) => item.id === task.phaseId);
        const haystack = [
          task.title,
          task.description,
          task.taskType,
          task.priority,
          activeProject.name,
          phase?.name,
          ...task.tags.map((tag) => tag.name)
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [activePhase, activeProject, filters, phases, tasks]);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const next = (await response.json()) as AppState;
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load ProjectFlow");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (!state) return;
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
      setShowHome(false);
      return;
    }
    if (!selectedProjectId && !showHome) {
      const nextProject =
        projects.find((project) => project.id === state.settings.defaultProjectId) ||
        projects.find((project) => project.status === "Active") ||
        projects[0];
      if (nextProject) {
        setSelectedProjectId(nextProject.id);
        router.replace(`/projects/${nextProject.id}`);
      }
    }
  }, [initialProjectId, projects, router, selectedProjectId, showHome, state]);

  useEffect(() => {
    const theme = state?.settings.theme || "dark";
    const root = document.documentElement;
    const apply = () => {
      const systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      root.classList.toggle("light", theme === "light" || (theme === "system" && systemLight));
      root.classList.toggle("dark", theme === "dark" || (theme === "system" && !systemLight));
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state?.settings.theme]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const applyApiResult = useCallback((payload: unknown) => {
    const next = isStateEnvelope(payload) ? payload.state : (payload as AppState);
    setState(next);
    return next;
  }, []);

  const requestState = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, init);
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      return applyApiResult(payload);
    },
    [applyApiResult]
  );

  const selectProject = useCallback(
    (projectId: string) => {
      setShowHome(false);
      setSelectedProjectId(projectId);
      setRightPanel(null);
      setSelectedTaskId(null);
      router.push(`/projects/${projectId}`);
      void requestState("/api/state", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lastOpenedProjectId: projectId })
      }).catch(() => undefined);
    },
    [requestState, router]
  );

  const openHome = useCallback(() => {
    setShowHome(true);
    setRightPanel(null);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    router.push("/");
  }, [router]);

  const createQuickTask = useCallback(
    async (columnId: string, title: string) => {
      if (!activeProject) return;
      const phaseId = phaseForNewTask(filters.phaseId, activePhase);
      await requestState("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          columnId,
          phaseId,
          title
        })
      });
    },
    [activePhase, activeProject, filters.phaseId, requestState]
  );

  const uploadFiles = useCallback(
    async (
      files: File[],
      options: {
        projectId?: string;
        columnId?: string | null;
        phaseId?: string | null;
        taskId?: string;
        title?: string;
      }
    ) => {
      if (files.length === 0) return;
      const form = new FormData();
      if (options.projectId) form.set("projectId", options.projectId);
      if (options.columnId) form.set("columnId", options.columnId);
      if (options.phaseId !== undefined) form.set("phaseId", options.phaseId || "");
      if (options.taskId) form.set("taskId", options.taskId);
      if (options.title) form.set("title", options.title);
      files.forEach((file, index) => {
        const name = file.name || `screenshot-${Date.now()}-${index + 1}.png`;
        form.append("files", file, name);
      });

      const response = await fetch("/api/attachments", { method: "POST", body: form });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      applyApiResult(payload);
      setToast(options.taskId ? "Attachment added" : "Screenshot task captured");
    },
    [applyApiResult]
  );

  const handleBoardPaste = useCallback(
    (event: ClipboardEvent) => {
      const files = imageFilesFromClipboard(event);
      if (files.length === 0 || !activeProject) return;
      event.preventDefault();

      if (rightPanel === "task" && selectedTask) {
        void uploadFiles(files, { taskId: selectedTask.id }).catch((err) =>
          setError(err instanceof Error ? err.message : "Unable to attach image")
        );
        return;
      }

      setPendingUpload({
        files,
        urls: files.map((file) => URL.createObjectURL(file)),
        columnId: projectColumns[0]?.id || null
      });
    },
    [activeProject, projectColumns, rightPanel, selectedTask, uploadFiles]
  );

  useEffect(() => {
    document.addEventListener("paste", handleBoardPaste);
    return () => document.removeEventListener("paste", handleBoardPaste);
  }, [handleBoardPaste]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRightPanel(null);
        setSelectedTaskId(null);
        setPendingUpload(null);
        setPreviewAttachment(null);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("[data-projectflow-search]")?.focus();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("[data-quick-add]")?.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('.task-card') || 
        target.closest('.modal') ||
        target.closest('.right-panel') ||
        target.closest('[data-bulk-action-bar]') ||
        target.closest('.sidebar')
      ) {
        return;
      }
      setSelectedTaskIds(prev => prev.length > 0 ? [] : prev);
      setSelectedTaskId(null);
      setRightPanel(prev => prev === "task" ? null : prev);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = (event.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setUndoStack((prev) => {
          if (prev.length === 0) return prev;
          const action = prev[prev.length - 1];
          const newStack = prev.slice(0, -1);
          
          if (action.type === "DELETE_TASKS") {
            requestState("/api/tasks/restore", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ taskIds: action.taskIds })
            })
              .then(() => setToast(`Restored ${action.taskIds.length} task(s)`))
              .catch((err) => setError(err instanceof Error ? err.message : "Failed to restore tasks"));
          } else if (action.type === "MOVE_TASKS") {
            requestState("/api/tasks/reorder", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ updates: action.previousUpdates })
            })
              .then(() => setToast("Undid task move"))
              .catch((err) => setError(err instanceof Error ? err.message : "Failed to undo move"));
          }
          return newStack;
        });
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedTaskIds.length > 0) {
        event.preventDefault();
        if (window.confirm(`Delete ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''}?`)) {
          const idsToDelete = [...selectedTaskIds];
          requestState("/api/tasks", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ taskIds: idsToDelete })
          })
            .then(() => {
              setSelectedTaskIds([]);
              setUndoStack((prev) => [...prev, { type: "DELETE_TASKS" as const, taskIds: idsToDelete }].slice(-20));
              setToast(`${idsToDelete.length} task${idsToDelete.length > 1 ? 's' : ''} deleted (Ctrl+Z to undo)`);
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Unable to delete tasks"));
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskIds, requestState]);

  useEffect(() => {
    if (!pendingUpload) return;
    return () => pendingUpload.urls.forEach((url) => URL.revokeObjectURL(url));
  }, [pendingUpload]);

  const handleDropFiles = useCallback(
    async (files: File[], columnId?: string | null, taskId?: string) => {
      if (!activeProject) return;
      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) return;

      if (taskId) {
        await uploadFiles(imageFiles, { taskId });
        return;
      }

      await uploadFiles(imageFiles, {
        projectId: activeProject.id,
        columnId: columnId || projectColumns[0]?.id,
        phaseId: phaseForNewTask(filters.phaseId, activePhase),
        title: "Untitled screenshot task"
      });
    },
    [activePhase, activeProject, filters.phaseId, projectColumns, uploadFiles]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragTaskId(null);
      setActiveOverId(null);
      if (!state || !activeProject) return;
      const activeId = String(event.active.id);
      const activeTask = state.tasks.find((task) => task.id === activeId);
      if (!activeTask || activeTask.projectId !== activeProject.id) return;

      const overId = event.over ? String(event.over.id) : "";
      if (!overId) return;

      const draggedTasksIds = new Set(selectedTaskIds.includes(activeId) ? selectedTaskIds : [activeId]);
      if (draggedTasksIds.has(overId)) return; // Dropped on one of the dragged items

      const overTask = state.tasks.find((task) => task.id === overId);
      const targetColumnId = overId.startsWith("column:")
        ? overId.replace("column:", "")
        : overTask?.columnId || activeTask.columnId;

      const draggedTasks = state.tasks
        .filter(t => t.projectId === activeProject.id && draggedTasksIds.has(t.id))
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const projectTaskList = state.tasks
        .filter((task) => task.projectId === activeProject.id && !draggedTasksIds.has(task.id))
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const targetList = projectTaskList.filter((task) => task.columnId === targetColumnId);

      let insertIndex: number;
      if (!overTask) {
        insertIndex = targetList.length;
      } else {
        const overIndexInTarget = targetList.findIndex((t) => t.id === overTask.id);
        const idx = overIndexInTarget === -1 ? targetList.length : overIndexInTarget;
        let insertAfter: boolean;
        if (activeTask.columnId === overTask.columnId) {
          insertAfter = activeTask.orderIndex < overTask.orderIndex;
        } else {
          const translated = event.active.rect.current.translated;
          const overRect = event.over?.rect;
          if (translated && overRect) {
            insertAfter = translated.top + translated.height / 2 > overRect.top + overRect.height / 2;
          } else {
            insertAfter = false;
          }
        }
        insertIndex = insertAfter ? idx + 1 : idx;
      }
      
      const movedTasks = draggedTasks.map(t => ({ ...t, columnId: targetColumnId }));
      targetList.splice(insertIndex, 0, ...movedTasks);

      const affectedColumnIds = new Set([targetColumnId, ...draggedTasks.map(t => t.columnId)]);
      const updates: TaskOrderUpdate[] = [];
      const previousUpdates: TaskOrderUpdate[] = [];
      const nextTasks = state.tasks.map((task) => {
        if (!affectedColumnIds.has(task.columnId) && !draggedTasksIds.has(task.id)) return task;
        
        if (draggedTasksIds.has(task.id)) {
          const orderIndex = (targetList.findIndex((item) => item.id === task.id) + 1) * 1000;
          updates.push({ taskId: task.id, columnId: targetColumnId, orderIndex });
          previousUpdates.push({ taskId: task.id, columnId: task.columnId, orderIndex: task.orderIndex });
          return { ...task, columnId: targetColumnId, orderIndex };
        }
        
        const sourceList = affectedColumnIds.has(task.columnId) 
          ? (task.columnId === targetColumnId ? targetList : projectTaskList.filter(item => item.columnId === task.columnId))
          : null;
          
        if (sourceList) {
          const orderIndex = (sourceList.findIndex((item) => item.id === task.id) + 1) * 1000;
          if (orderIndex > 0 && orderIndex !== task.orderIndex) {
            updates.push({ taskId: task.id, columnId: task.columnId, orderIndex });
            previousUpdates.push({ taskId: task.id, columnId: task.columnId, orderIndex: task.orderIndex });
            return { ...task, orderIndex };
          }
        }
        return task;
      });

      if (previousUpdates.length > 0) {
        setUndoStack((prev) => [...prev, { type: "MOVE_TASKS" as const, previousUpdates }].slice(-20));
      }

      setState({ ...state, tasks: nextTasks });
      try {
        await requestState("/api/tasks/reorder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ updates })
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save task order");
        void loadState();
      }
    },
    [activeProject, loadState, requestState, state, selectedTaskIds, setUndoStack]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragTaskId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setActiveOverId(event.over ? String(event.over.id) : null);
  }, []);

  if (loading && !state) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <img src="/logo.png" alt="ProjectFlow Logo" className="w-5 h-5 object-contain" />
          ProjectFlow
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] p-6 text-[var(--text)]">
        <div className="modal p-5">
          <div className="mb-3 text-lg font-semibold">ProjectFlow could not start</div>
          <p className="text-sm text-[var(--muted)]">{error || "Unknown error"}</p>
          <button className="text-button mt-4" onClick={() => void loadState()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        filters={filters}
        dataRoot={state.dataRoot}
        onFilterChange={setFilters}
        onHome={openHome}
        onProjectSelect={selectProject}
        onNewProject={() => setNewProjectOpen(true)}
        onSettings={() => setRightPanel("settings")}
      />

      <main className="main-area">
        {showHome || !activeProject ? (
          <Dashboard
            projects={projects}
            phases={phases}
            columns={columns}
            tasks={tasks}
            onProjectSelect={selectProject}
            onNewProject={() => setNewProjectOpen(true)}
          />
        ) : (
          <>
            <BoardHeader
              project={activeProject}
              phases={projectPhases}
              activePhase={activePhase}
              taskCount={filteredTasks.length}
              onProjectSettings={() => setRightPanel("project")}
              onCreateTask={() => {
                const input = document.querySelector<HTMLInputElement>(
                  `[data-quick-add="${projectColumns[0]?.id || ""}"]`
                );
                input?.focus();
              }}
            />

            <FilterBar
              filters={filters}
              phases={projectPhases}
              onChange={setFilters}
            />

            <div className="board-shell">
              <div className="board-scroll thin-scrollbar">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragCancel={() => { setActiveDragTaskId(null); setActiveOverId(null); }}
                  onDragEnd={handleDragEnd}
                >
                  <div className="board-grid">
                    {projectColumns.map((column, index) => (
                      <KanbanColumn
                        key={column.id}
                        column={column}
                        columns={projectColumns}
                        columnIndex={index}
                        tasks={filteredTasks.filter((task) => task.columnId === column.id)}
                        activeOverId={activeDragTaskId ? activeOverId : null}
                        selectedTaskIds={selectedTaskIds}
                        onQuickAdd={createQuickTask}
                        onTaskSelect={(taskId, e) => {
                          if (e.ctrlKey || e.metaKey) {
                            setSelectedTaskIds(prev =>
                              prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
                            );
                            setRightPanel(null);
                          } else if (e.shiftKey) {
                            const colTasks = filteredTasks.filter(t => t.columnId === column.id);
                            const lastSelected = selectedTaskIds[selectedTaskIds.length - 1];
                            const lastIdx = colTasks.findIndex(t => t.id === lastSelected);
                            const currIdx = colTasks.findIndex(t => t.id === taskId);
                            if (lastIdx !== -1 && currIdx !== -1) {
                              const min = Math.min(lastIdx, currIdx);
                              const max = Math.max(lastIdx, currIdx);
                              const rangeIds = colTasks.slice(min, max + 1).map(t => t.id);
                              setSelectedTaskIds(prev => Array.from(new Set([...prev, ...rangeIds])));
                            } else {
                              setSelectedTaskIds(prev => [...prev, taskId]);
                            }
                            setRightPanel(null);
                          } else {
                            setSelectedTaskIds([taskId]);
                            setSelectedTaskId(taskId);
                            setRightPanel("task");
                          }
                        }}
                        onFilesDrop={(files) =>
                          handleDropFiles(files, column.id).catch((err) =>
                            setError(err instanceof Error ? err.message : "Unable to capture image")
                          )
                        }
                        onTaskFilesDrop={(taskId, files) =>
                          handleDropFiles(files, null, taskId).catch((err) =>
                            setError(err instanceof Error ? err.message : "Unable to attach image")
                          )
                        }
                        onRename={(name) =>
                          requestState("/api/columns", {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ columnId: column.id, name })
                          }).catch((err) =>
                            setError(err instanceof Error ? err.message : "Unable to rename column")
                          )
                        }
                        onMove={(direction) =>
                          moveColumn(column, direction, projectColumns, requestState, setError)
                        }
                        onDelete={(moveToColumnId) =>
                          requestState("/api/columns", {
                            method: "DELETE",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ columnId: column.id, moveToColumnId })
                          }).catch((err) =>
                            setError(err instanceof Error ? err.message : "Unable to delete column")
                          )
                        }
                      />
                    ))}

                    <AddColumn
                      onAdd={(name) =>
                        activeProject &&
                        requestState("/api/columns", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ projectId: activeProject.id, name })
                        }).catch((err) =>
                          setError(err instanceof Error ? err.message : "Unable to add column")
                        )
                      }
                    />
                  </div>
                  <DragOverlay
                    dropAnimation={{
                      duration: 170,
                      easing: "cubic-bezier(0.22, 1, 0.36, 1)"
                    }}
                  >
                    {activeDragTask ? (
                      <TaskDragOverlay 
                        task={activeDragTask} 
                        selectedCount={selectedTaskIds.includes(activeDragTask.id) ? selectedTaskIds.length : 1}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </>
        )}
      </main>

      {rightPanel === "task" && selectedTask && activeProject ? (
        <TaskPanel
          task={selectedTask}
          project={activeProject}
          phases={projectPhases}
          columns={projectColumns}
          onClose={() => {
            setRightPanel(null);
            setSelectedTaskId(null);
          }}
          onSave={(patch) =>
            requestState("/api/tasks", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ taskId: selectedTask.id, ...patch })
            }).then(() => setToast("Task saved"))
          }
          onArchive={() =>
            requestState("/api/tasks", {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ taskIds: [selectedTask.id] })
            }).then(() => {
              const idsToDelete = [selectedTask.id];
              setRightPanel(null);
              setSelectedTaskId(null);
              setUndoStack(prev => [...prev, { type: "DELETE_TASKS" as const, taskIds: idsToDelete }].slice(-20));
              setToast("Task archived (Ctrl+Z to undo)");
            })
          }
          onAttachFiles={(files) => uploadFiles(files, { taskId: selectedTask.id })}
          onDeleteAttachment={(attachmentId) =>
            requestState("/api/attachments", {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ attachmentId })
            })
          }
          onPreview={setPreviewAttachment}
        />
      ) : null}

      {rightPanel === "project" && activeProject ? (
        <ProjectPanel
          project={activeProject}
          phases={projectPhases}
          columns={projectColumns}
          onClose={() => setRightPanel(null)}
          onSave={(patch) =>
            requestState(`/api/projects/${activeProject.id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(patch)
            }).then(() => setToast("Project saved"))
          }
          onIconUpload={async (file) => {
            const form = new FormData();
            form.set("icon", file, file.name);
            await requestState(`/api/projects/${activeProject.id}`, {
              method: "PATCH",
              body: form
            });
            setToast("Icon updated");
          }}
          onCreatePhase={(name) =>
            requestState("/api/phases", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ projectId: activeProject.id, name, isActive: false })
            })
          }
          onSetActivePhase={(phaseId) =>
            requestState("/api/phases", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ phaseId, isActive: true })
            })
          }
        />
      ) : null}

      {rightPanel === "settings" ? (
        <SettingsPanel
          state={state}
          activeProject={activeProject}
          onClose={() => setRightPanel(null)}
          onSave={(settings) =>
            requestState("/api/state", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ settings })
            }).then(() => setToast("Settings saved"))
          }
          onImport={(file) => importBackup(file, applyApiResult, setToast, setError)}
        />
      ) : null}

      {pendingUpload && activeProject ? (
        <PendingUploadModal
          pending={pendingUpload}
          columns={projectColumns}
          onClose={() => setPendingUpload(null)}
          onSubmit={(title, columnId) =>
            uploadFiles(pendingUpload.files, {
              projectId: activeProject.id,
              columnId,
              phaseId: phaseForNewTask(filters.phaseId, activePhase),
              title: title.trim() || "Untitled screenshot task"
            }).then(() => setPendingUpload(null))
          }
        />
      ) : null}

      {newProjectOpen ? (
        <NewProjectModal
          onClose={() => setNewProjectOpen(false)}
          onCreate={async (name) => {
            const next = await requestState("/api/projects", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name })
            });
            const created = next.projects.find((project) => project.name === name) || next.projects[0];
            setNewProjectOpen(false);
            if (created) selectProject(created.id);
          }}
        />
      ) : null}

      {previewAttachment ? (
        <div className="modal-backdrop" onClick={() => setPreviewAttachment(null)}>
          <div className="max-h-[92vh] max-w-[92vw] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <img
              alt={previewAttachment.fileName}
              src={previewAttachment.url}
              className="max-h-[92vh] max-w-[92vw] object-contain"
            />
          </div>
        </div>
      ) : null}

      {selectedTaskIds.length > 1 ? (
        <div 
          data-bulk-action-bar 
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full border border-[var(--border)] bg-[var(--panel)] p-2 px-4 shadow-flow flex items-center gap-4"
        >
          <span className="text-sm font-medium">{selectedTaskIds.length} tasks selected</span>
          <button 
            className="text-button danger"
            onClick={() => {
              if (window.confirm(`Delete ${selectedTaskIds.length} tasks?`)) {
                requestState("/api/tasks", {
                  method: "DELETE",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ taskIds: selectedTaskIds })
                  }).then(() => {
                    const idsToDelete = [...selectedTaskIds];
                    setSelectedTaskIds([]);
                    setUndoStack(prev => [...prev, { type: "DELETE_TASKS" as const, taskIds: idsToDelete }].slice(-20));
                    setToast(`${idsToDelete.length} tasks deleted (Ctrl+Z to undo)`);
                  }).catch(err => 
                  setError(err instanceof Error ? err.message : "Unable to delete tasks")
                );
              }
            }}
          >
            <Trash2 size={15} />
            Delete
          </button>
          <div className="h-4 w-px bg-[var(--border)]" />
          <button 
            className="icon-button"
            title="Clear selection"
            onClick={() => setSelectedTaskIds([])}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-4 left-4 z-50 max-w-md rounded-lg border border-[var(--danger)] bg-[var(--bg)] p-3 text-sm shadow-flow">
          <div className="flex items-start gap-3">
            <div className="flex-1">{error}</div>
            <button className="icon-button h-7 w-7" title="Dismiss" onClick={() => setError(null)}>
              <X size={15} />
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm shadow-flow">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({
  projects,
  selectedProjectId,
  filters,
  dataRoot,
  onFilterChange,
  onHome,
  onProjectSelect,
  onNewProject,
  onSettings
}: {
  projects: Project[];
  selectedProjectId: string | null;
  filters: Filters;
  dataRoot: string;
  onFilterChange: (filters: Filters) => void;
  onHome: () => void;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
  onSettings: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="mb-4 flex items-center gap-3">
          <img src="/logo.png" alt="ProjectFlow Logo" className="w-8 h-8 object-contain" />
          <div>
            <div className="text-base font-semibold">ProjectFlow</div>
            <div className="text-xs text-[var(--muted)]">Local kanban</div>
          </div>
        </div>
        <label className="input-with-icon relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
            size={16}
          />
          <input
            className="text-input"
            data-projectflow-search
            placeholder="Search"
            value={filters.query}
            onChange={(event) => onFilterChange({ ...filters, query: event.target.value })}
          />
        </label>
      </div>

      <div className="sidebar-body thin-scrollbar">
        <button className="project-row" onClick={onHome}>
          <span className="project-icon">
            <Home size={17} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">Dashboard</span>
            <span className="block truncate text-xs text-[var(--muted)]">Active work</span>
          </span>
        </button>

        <div className="my-3 flex items-center justify-between px-2 text-xs uppercase text-[var(--faint)]">
          <span>Projects</span>
          <button className="icon-button h-7 w-7" title="New project" onClick={onNewProject}>
            <Plus size={15} />
          </button>
        </div>

        <div className="grid gap-1">
          {projects.map((project) => (
            <button
              key={project.id}
              className={clsx("project-row", project.id === selectedProjectId && "active")}
              onClick={() => onProjectSelect(project.id)}
            >
              <ProjectIcon project={project} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{project.name}</span>
                <span className="block truncate text-xs text-[var(--muted)]">{project.status}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="mb-2 truncate text-xs text-[var(--faint)]" title={dataRoot}>
          {dataRoot}
        </div>
        <div className="flex gap-2">
          <button className="icon-button" title="Settings" onClick={onSettings}>
            <Settings size={17} />
          </button>
          <a className="icon-button" title="Export backup" href="/api/backup/export">
            <Download size={17} />
          </a>
        </div>
      </div>
    </aside>
  );
}

function Dashboard({
  projects,
  phases,
  columns,
  tasks,
  onProjectSelect,
  onNewProject
}: {
  projects: Project[];
  phases: Phase[];
  columns: BoardColumn[];
  tasks: Task[];
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}) {
  const activeProjects = projects.filter((project) => project.status === "Active");
  const recentTasks = [...tasks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);
  const inProgressTasks = tasks.filter((task) => {
    const column = columns.find((item) => item.id === task.columnId);
    return column?.name.toLowerCase().includes("progress");
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="flex items-center gap-3">
            <FolderKanban size={24} className="text-[var(--accent)]" />
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {activeProjects.length} active projects, {tasks.length} open tasks
          </div>
        </div>
        <button className="text-button primary" onClick={onNewProject}>
          <Plus size={16} />
          Project
        </button>
      </div>

      <div className="overview-grid thin-scrollbar overflow-auto">
        <section className="overview-panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Active Projects</h2>
            <FolderKanban size={17} className="text-[var(--muted)]" />
          </div>
          <div className="grid gap-2">
            {activeProjects.map((project) => {
              const phase = phases.find((item) => item.projectId === project.id && item.isActive);
              return (
                <button
                  key={project.id}
                  className="project-row"
                  onClick={() => onProjectSelect(project.id)}
                >
                  <ProjectIcon project={project} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{project.name}</span>
                    <span className="block truncate text-xs text-[var(--muted)]">
                      {phase?.name || "No active phase"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overview-panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">In Progress</h2>
            <Columns3 size={17} className="text-[var(--muted)]" />
          </div>
          <TaskListSummary tasks={inProgressTasks.slice(0, 8)} />
        </section>

        <section className="overview-panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recently Updated</h2>
            <Check size={17} className="text-[var(--muted)]" />
          </div>
          <TaskListSummary tasks={recentTasks} />
        </section>
      </div>
    </>
  );
}

function TaskListSummary({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <div className="text-sm text-[var(--muted)]">Nothing here yet.</div>;
  }
  return (
    <div className="grid gap-2">
      {tasks.map((task) => (
        <div key={task.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <div className="line-clamp-2 text-sm font-medium">{task.title}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {task.priority ? (
              <span className={priorityClass(task.priority)}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                {task.priority}
              </span>
            ) : null}
            {task.taskType ? (
              <span className="pill">
                <Box size={12} className="opacity-70" />
                {task.taskType}
              </span>
            ) : null}
            {task.attachments.length ? (
              <span className="pill">
                <ImageIcon size={12} className="opacity-70" />
                {task.attachments.length}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardHeader({
  project,
  phases,
  activePhase,
  taskCount,
  onProjectSettings,
  onCreateTask
}: {
  project: Project;
  phases: Phase[];
  activePhase: Phase | null;
  taskCount: number;
  onProjectSettings: () => void;
  onCreateTask: () => void;
}) {
  return (
    <header className="topbar">
      <div className="flex min-w-0 items-center gap-3">
        <ProjectIcon project={project} size="large" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span>{activePhase?.name || phases[0]?.name || "No phase"}</span>
            <span className="text-[var(--faint)]">/</span>
            <span>{taskCount} tasks</span>
          </div>
        </div>
      </div>
      <div className="toolbar justify-end">
        <button className="icon-button" title="New task" onClick={onCreateTask}>
          <Plus size={17} />
        </button>
        <button className="icon-button" title="Project settings" onClick={onProjectSettings}>
          <PanelRight size={17} />
        </button>
      </div>
    </header>
  );
}

function FilterBar({
  filters,
  phases,
  onChange
}: {
  filters: Filters;
  phases: Phase[];
  onChange: (filters: Filters) => void;
}) {
  return (
    <div className="filterbar">
      <label className="input-with-icon relative">
        <Filter
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
          size={16}
        />
        <input
          className="text-input"
          placeholder="Filter board"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
        />
      </label>
      <select
        className="select-input"
        value={filters.phaseId}
        onChange={(event) => onChange({ ...filters, phaseId: event.target.value })}
      >
        <option value="active">Active phase</option>
        <option value="all">All phases</option>
        <option value="none">No phase</option>
        {phases.map((phase) => (
          <option key={phase.id} value={phase.id}>
            {phase.name}
          </option>
        ))}
      </select>
      <select
        className="select-input"
        value={filters.priority}
        onChange={(event) => onChange({ ...filters, priority: event.target.value as Priority | "all" })}
      >
        <option value="all">Any priority</option>
        {PRIORITIES.filter(Boolean).map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <select
        className="select-input"
        value={filters.taskType}
        onChange={(event) => onChange({ ...filters, taskType: event.target.value as TaskType | "all" })}
      >
        <option value="all">Any type</option>
        {TASK_TYPES.filter(Boolean).map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <select
        className="select-input"
        value={filters.hasAttachment}
        onChange={(event) =>
          onChange({ ...filters, hasAttachment: event.target.value as Filters["hasAttachment"] })
        }
      >
        <option value="all">Any images</option>
        <option value="yes">Has images</option>
        <option value="no">No images</option>
      </select>
    </div>
  );
}

function KanbanColumn({
  column,
  columns,
  columnIndex,
  tasks,
  activeOverId,
  selectedTaskIds,
  onQuickAdd,
  onTaskSelect,
  onFilesDrop,
  onTaskFilesDrop,
  onRename,
  onMove,
  onDelete
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  columnIndex: number;
  tasks: Task[];
  activeOverId: string | null;
  selectedTaskIds: string[];
  onQuickAdd: (columnId: string, title: string) => Promise<void>;
  onTaskSelect: (taskId: string, e: any) => void;
  onFilesDrop: (files: File[]) => void;
  onTaskFilesDrop: (taskId: string, files: File[]) => void;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: (moveToColumnId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `column:${column.id}` });
  const isColumnOver = !!(
    activeOverId &&
    (activeOverId === `column:${column.id}` || tasks.some((t) => t.id === activeOverId))
  );

  return (
    <section
      ref={setNodeRef}
      className={clsx("kanban-column", isColumnOver && "is-over")}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        const files = filesFromDataTransfer(event.dataTransfer);
        if (files.length > 0) {
          event.preventDefault();
          onFilesDrop(files);
        }
      }}
    >
      <div className="column-header">
        <button
          className="min-w-0 text-left"
          title="Rename column"
          onClick={() => {
            const next = window.prompt("Column name", column.name);
            if (next && next.trim() && next !== column.name) onRename(next);
          }}
        >
          <div className="truncate text-sm font-semibold">{column.name}</div>
          <div className="text-xs text-[var(--muted)]">{tasks.length} tasks</div>
        </button>
        <div className="flex gap-1">
          <button
            className="icon-button h-7 w-7"
            title="Move left"
            disabled={columnIndex === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className="icon-button h-7 w-7"
            title="Move right"
            disabled={columnIndex === columns.length - 1}
            onClick={() => onMove(1)}
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="icon-button h-7 w-7"
            title="Delete column"
            onClick={() => {
              const target = columns.find((item) => item.id !== column.id);
              if (!target) return;
              if (window.confirm(`Move existing tasks to ${target.name} and delete ${column.name}?`)) {
                onDelete(target.id);
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="column-list thin-scrollbar">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              isDropTarget={activeOverId === task.id}
              isSelected={selectedTaskIds.includes(task.id)}
              onOpen={(e) => onTaskSelect(task.id, e)}
              onFilesDrop={(files) => onTaskFilesDrop(task.id, files)}
            />
          ))}
        </div>
      </SortableContext>

      <QuickAdd columnId={column.id} onSubmit={onQuickAdd} />
    </section>
  );
}

function QuickAdd({
  columnId,
  onSubmit
}: {
  columnId: string;
  onSubmit: (columnId: string, title: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function submit() {
    const title = value.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onSubmit(columnId, title);
      setValue("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="quick-add">
      <input
        ref={inputRef}
        data-quick-add={columnId}
        className="text-input"
        placeholder="Add task..."
        value={value}
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
      />
    </div>
  );
}

function SortableTaskCard({
  task,
  isDropTarget,
  isSelected,
  onOpen,
  onFilesDrop
}: {
  task: Task;
  isDropTarget: boolean;
  isSelected: boolean;
  onOpen: (e: any) => void;
  onFilesDrop: (files: File[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const firstAttachment = task.attachments[0];

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx("task-card relative", isDragging && "dragging", isDropTarget && "drop-target", isSelected && "selected-glow")}
      {...attributes}
      {...listeners}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        const files = filesFromDataTransfer(event.dataTransfer);
        if (files.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          onFilesDrop(files);
        }
      }}
    >
      {isSelected ? (
        <div className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-md">
          <Check size={16} strokeWidth={3} />
        </div>
      ) : null}
      
      {firstAttachment ? (
        <button className="task-thumb" draggable={false} onClick={onOpen}>
          <img
            alt={firstAttachment.fileName}
            draggable={false}
            src={firstAttachment.url}
            loading="lazy"
            onDragStart={(event) => event.preventDefault()}
          />
        </button>
      ) : null}

      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[var(--faint)]" title="Drag task">
          <Columns3 size={15} />
        </span>
        <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <div className="line-clamp-3 text-sm font-medium leading-5">{task.title}</div>
        </button>
        <button
          className={clsx("mt-0.5 shrink-0 transition-colors", copied ? "text-[var(--good)]" : "text-[var(--faint)] hover:text-[var(--text)]")}
          title="Copy AI Prompt"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            void copyTaskWithImages(task.title, task.description, task.notes, task.attachments);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
        </button>
      </div>

      <button className="flex flex-wrap gap-1 text-left" onClick={onOpen}>
        {task.priority ? (
          <span className={priorityClass(task.priority)}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {task.priority}
          </span>
        ) : null}
        {task.taskType ? (
          <span className="pill">
            <Box size={12} className="opacity-70" />
            {task.taskType}
          </span>
        ) : null}
        {task.attachments.length > 1 ? (
          <span className="pill">
            <ImageIcon size={12} className="opacity-70" />
            {task.attachments.length}
          </span>
        ) : null}
        {task.tags.slice(0, 3).map((tag) => (
          <span key={tag.id} className="pill pill-tag" style={{ "--tag-color": tag.color } as React.CSSProperties}>
            <span className="text-[10px] opacity-60">#</span>
            {tag.name}
          </span>
        ))}
      </button>
    </article>
  );
}

function TaskDragOverlay({ task, selectedCount }: { task: Task; selectedCount?: number }) {
  const firstAttachment = task.attachments[0];

  return (
    <article className="task-card task-drag-overlay relative">
      {selectedCount && selectedCount > 1 ? (
        <div className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white shadow-md">
          {selectedCount}
        </div>
      ) : null}
      {firstAttachment ? (
        <div className="task-thumb">
          <img
            alt={firstAttachment.fileName}
            draggable={false}
            src={firstAttachment.url}
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[var(--accent)]">
          <Columns3 size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-3 text-sm font-medium leading-5">{task.title}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {task.priority ? (
          <span className={priorityClass(task.priority)}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {task.priority}
          </span>
        ) : null}
        {task.taskType ? (
          <span className="pill">
            <Box size={12} className="opacity-70" />
            {task.taskType}
          </span>
        ) : null}
        {task.attachments.length > 1 ? (
          <span className="pill">
            <ImageIcon size={12} className="opacity-70" />
            {task.attachments.length}
          </span>
        ) : null}
        {task.tags.slice(0, 3).map((tag) => (
          <span key={tag.id} className="pill pill-tag" style={{ "--tag-color": tag.color } as React.CSSProperties}>
            <span className="text-[10px] opacity-60">#</span>
            {tag.name}
          </span>
        ))}
      </div>
    </article>
  );
}

function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <section className="kanban-column min-h-[220px]">
      <div className="column-header">
        <div>
          <div className="text-sm font-semibold">Add Column</div>
          <div className="text-xs text-[var(--muted)]">Customize this board</div>
        </div>
      </div>
      <div className="p-3">
        <input
          className="text-input"
          placeholder="Column name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) {
              onAdd(value.trim());
              setValue("");
            }
          }}
        />
        <button
          className="text-button mt-2 w-full"
          onClick={() => {
            if (value.trim()) {
              onAdd(value.trim());
              setValue("");
            }
          }}
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    </section>
  );
}

function TaskPanel({
  task,
  project,
  phases,
  columns,
  onClose,
  onSave,
  onArchive,
  onAttachFiles,
  onDeleteAttachment,
  onPreview
}: {
  task: Task;
  project: Project;
  phases: Phase[];
  columns: BoardColumn[];
  onClose: () => void;
  onSave: (patch: {
    title: string;
    description: string;
    notes: string;
    phaseId: string | null;
    columnId: string;
    taskType: TaskType;
    priority: Priority;
    tags: string[];
  }) => Promise<void>;
  onArchive: () => Promise<void>;
  onAttachFiles: (files: File[]) => Promise<void>;
  onDeleteAttachment: (attachmentId: string) => Promise<AppState>;
  onPreview: (attachment: Attachment) => void;
}) {
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description,
    notes: task.notes || "",
    phaseId: task.phaseId || "",
    columnId: task.columnId,
    taskType: task.taskType,
    priority: task.priority,
    tags: task.tags.map((tag) => tag.name).join(", ")
  });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoFillBusy, setAutoFillBusy] = useState(false);

  async function autoFill() {
    setAutoFillBusy(true);
    try {
      const response = await fetch("/api/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          attachments: task.attachments
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to auto-fill");
      }
      const data = await response.json();
      setDraft((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        taskType: data.taskType || prev.taskType,
        tags: data.tags && data.tags.length > 0 ? data.tags.join(", ") : prev.tags
      }));
    } catch (err: any) {
      alert(err.message || "Failed to run AI Auto-Fill");
    } finally {
      setAutoFillBusy(false);
    }
  }

  useEffect(() => {
    setDraft({
      title: task.title,
      description: task.description,
      notes: task.notes || "",
      phaseId: task.phaseId || "",
      columnId: task.columnId,
      taskType: task.taskType,
      priority: task.priority,
      tags: task.tags.map((tag) => tag.name).join(", ")
    });
  }, [task]);

  async function save() {
    setBusy(true);
    try {
      await onSave({
        ...draft,
        phaseId: draft.phaseId || null,
        tags: draft.tags.split(",").map((tag) => tag.trim())
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className="right-panel"
      onPaste={(event) => {
        const files = imageFilesFromClipboard(event.nativeEvent);
        if (files.length) {
          event.preventDefault();
          void onAttachFiles(files);
        }
      }}
    >
      <div className="panel-header">
        <div className="min-w-0">
          <div className="truncate text-sm text-[var(--muted)]">{project.name}</div>
          <div className="truncate font-semibold">Task Details</div>
        </div>
        <button className="icon-button" title="Close" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <div className="panel-body thin-scrollbar">
        <div className="field-stack">
          <div className="flex items-center justify-between mb-1">
            <label className="field-label mb-0">Title</label>
            <button
              type="button"
              className={clsx(
                "flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
                autoFillBusy ? "text-[var(--muted)]" : "text-[var(--good)] hover:opacity-80"
              )}
              onClick={() => void autoFill()}
              disabled={autoFillBusy}
            >
              <Sparkles size={12} />
              <span>{autoFillBusy ? "Analyzing..." : "Auto-Fill"}</span>
            </button>
          </div>
          <input
            className="text-input"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </div>

        <div className="field-stack">
          <label className="field-label">Description</label>
          <textarea
            className="textarea-input"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </div>

        <div className="field-stack">
          <label className="field-label">Notes</label>
          <textarea
            className="textarea-input"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="field-stack">
            <label className="field-label">Column</label>
            <select
              className="select-input"
              value={draft.columnId}
              onChange={(event) => setDraft({ ...draft, columnId: event.target.value })}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Phase</label>
            <select
              className="select-input"
              value={draft.phaseId}
              onChange={(event) => setDraft({ ...draft, phaseId: event.target.value })}
            >
              <option value="">No phase</option>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Type</label>
            <select
              className="select-input"
              value={draft.taskType}
              onChange={(event) => setDraft({ ...draft, taskType: event.target.value as TaskType })}
            >
              {TASK_TYPES.map((type) => (
                <option key={type || "none"} value={type}>
                  {type || "None"}
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Priority</label>
            <select
              className="select-input"
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority || "none"} value={priority}>
                  {priority || "None"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-stack">
          <label className="field-label">Tags</label>
          <input
            className="text-input"
            value={draft.tags}
            onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
          />
        </div>

        <div className="field-stack">
          <div className="flex items-center justify-between">
            <label className="field-label">AI Prompt</label>
            <button
              className={clsx(
                "flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
                copied ? "text-[var(--good)]" : "text-[var(--muted)] hover:text-[var(--text)]"
              )}
              onClick={() => {
                void copyTaskWithImages(draft.title, draft.description, draft.notes, task.attachments);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy to clipboard"
            >
              {copied ? <Check size={12} /> : <Clipboard size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <textarea
            className="textarea-input text-xs text-[var(--muted)] font-mono"
            style={{ opacity: 0.7, minHeight: '80px' }}
            rows={4}
            readOnly
            value={`Task: ${draft.title}\nDescription: ${draft.description || "None"}${draft.notes ? `\nNotes: ${draft.notes}` : ''}`}
          />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Attachments</div>
          <label className="icon-button cursor-pointer" title="Upload image">
            <Upload size={16} />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length) void onAttachFiles(files);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="attachment-grid">
          {task.attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-preview">
              <button className="h-full w-full" onClick={() => onPreview(attachment)}>
                <img alt={attachment.fileName} src={attachment.url} loading="lazy" />
              </button>
              <button
                className="icon-button absolute right-2 top-2 h-7 w-7"
                title="Delete attachment"
                onClick={() => void onDeleteAttachment(attachment.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="modal-footer">
        <button className="text-button danger" onClick={() => void onArchive()}>
          <Archive size={16} />
          Archive
        </button>
        <button className="text-button primary" disabled={busy} onClick={() => void save()}>
          <Save size={16} />
          Save
        </button>
      </div>
    </aside>
  );
}

function ProjectPanel({
  project,
  phases,
  columns,
  onClose,
  onSave,
  onIconUpload,
  onCreatePhase,
  onSetActivePhase
}: {
  project: Project;
  phases: Phase[];
  columns: BoardColumn[];
  onClose: () => void;
  onSave: (patch: Partial<Project>) => Promise<void>;
  onIconUpload: (file: File) => Promise<void>;
  onCreatePhase: (name: string) => Promise<AppState>;
  onSetActivePhase: (phaseId: string) => Promise<AppState>;
}) {
  const [draft, setDraft] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    color: project.color,
    iconType: project.iconType,
    iconValue: project.iconValue || ""
  });
  const [phaseName, setPhaseName] = useState("");

  useEffect(() => {
    setDraft({
      name: project.name,
      description: project.description,
      status: project.status,
      color: project.color,
      iconType: project.iconType,
      iconValue: project.iconValue || ""
    });
  }, [project]);

  return (
    <aside className="right-panel">
      <div className="panel-header">
        <div className="flex min-w-0 items-center gap-3">
          <ProjectIcon project={project} />
          <div className="min-w-0">
            <div className="truncate font-semibold">Project Settings</div>
            <div className="truncate text-sm text-[var(--muted)]">{columns.length} columns</div>
          </div>
        </div>
        <button className="icon-button" title="Close" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <div className="panel-body thin-scrollbar">
        <div className="field-stack">
          <label className="field-label">Name</label>
          <input
            className="text-input"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Description</label>
          <textarea
            className="textarea-input"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="field-stack">
            <label className="field-label">Status</label>
            <select
              className="select-input"
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as ProjectStatus })
              }
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Color</label>
            <input
              className="h-[34px] w-full rounded-[7px] border border-[var(--border)] bg-[var(--panel)] p-1"
              type="color"
              value={draft.color}
              onChange={(event) => setDraft({ ...draft, color: event.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="field-stack">
            <label className="field-label">Icon text</label>
            <input
              className="text-input"
              value={draft.iconType === "letter" ? draft.iconValue : ""}
              placeholder="e.g. PF"
              onChange={(event) =>
                setDraft({ ...draft, iconType: "letter", iconValue: event.target.value })
              }
            />
          </div>
          <label className="icon-button mt-[22px] cursor-pointer" title="Upload icon">
            <Upload size={16} />
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/x-icon"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onIconUpload(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="field-stack">
          <label className="field-label">Built-in Icons</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(BUILT_IN_ICONS).map(iconName => {
              const IconComp = BUILT_IN_ICONS[iconName];
              const isSelected = draft.iconType === "built_in" && draft.iconValue === iconName;
              return (
                <button
                  type="button"
                  key={iconName}
                  className={clsx(
                    "icon-button transition-all",
                    isSelected && "scale-110 shadow-md"
                  )}
                  style={
                    isSelected
                      ? { 
                          backgroundColor: draft.color, 
                          color: "#fff", 
                          outline: `2px solid ${draft.color}`, 
                          outlineOffset: "2px" 
                        }
                      : undefined
                  }
                  onClick={() => setDraft({ ...draft, iconType: "built_in", iconValue: iconName })}
                >
                  <IconComp size={16} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 mt-4 flex items-center justify-between">
          <div className="font-semibold">Phases</div>
          <button
            className="icon-button"
            title="Add phase"
            onClick={() => {
              if (!phaseName.trim()) return;
              void onCreatePhase(phaseName.trim()).then(() => setPhaseName(""));
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <input
          className="text-input mb-3"
          placeholder="New phase"
          value={phaseName}
          onChange={(event) => setPhaseName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && phaseName.trim()) {
              void onCreatePhase(phaseName.trim()).then(() => setPhaseName(""));
            }
          }}
        />
        <div className="grid gap-2">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{phase.name}</div>
                <div className="text-xs text-[var(--muted)]">{phase.status}</div>
              </div>
              <button
                className="icon-button h-7 w-7"
                title="Set active phase"
                onClick={() => void onSetActivePhase(phase.id)}
              >
                {phase.isActive ? <Check size={14} /> : <Sparkles size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="modal-footer">
        <button className="text-button primary" onClick={() => void onSave(draft)}>
          <Save size={16} />
          Save
        </button>
      </div>
    </aside>
  );
}

function SettingsPanel({
  state,
  activeProject,
  onClose,
  onSave,
  onImport
}: {
  state: AppState;
  activeProject: Project | null;
  onClose: () => void;
  onSave: (settings: Partial<AppState["settings"]>) => Promise<void>;
  onImport: (file: File) => Promise<void>;
}) {
  const [draft, setDraft] = useState(state.settings);

  useEffect(() => setDraft(state.settings), [state.settings]);

  return (
    <aside className="right-panel">
      <div className="panel-header">
        <div>
          <div className="font-semibold">Settings</div>
          <div className="text-sm text-[var(--muted)]">{activeProject?.name || "ProjectFlow"}</div>
        </div>
        <button className="icon-button" title="Close" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <div className="panel-body thin-scrollbar">
        <div className="field-stack mb-4 border-b border-[var(--border)] pb-4">
          <label className="field-label">Gemini API Key (for AI Auto-Fill)</label>
          <input
            className="text-input"
            type="password"
            placeholder="Enter key to enable ✨ Auto-Fill"
            value={draft.geminiApiKey || ""}
            onChange={(event) =>
              setDraft({ ...draft, geminiApiKey: event.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="field-stack">
            <label className="field-label">Theme</label>
            <select
              className="select-input"
              value={draft.theme}
              onChange={(event) => setDraft({ ...draft, theme: event.target.value as ThemeSetting })}
            >
              {THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Open mode</label>
            <select
              className="select-input"
              value={draft.browserOpenMode}
              onChange={(event) =>
                setDraft({ ...draft, browserOpenMode: event.target.value as BrowserOpenMode })
              }
            >
              {OPEN_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="field-stack">
            <label className="field-label">Port</label>
            <input
              className="text-input"
              type="number"
              value={draft.localServerPort}
              onChange={(event) =>
                setDraft({ ...draft, localServerPort: Number(event.target.value || 3344) })
              }
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Default project</label>
            <select
              className="select-input"
              value={draft.defaultProjectId || ""}
              onChange={(event) => setDraft({ ...draft, defaultProjectId: event.target.value || null })}
            >
              <option value="">None</option>
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-stack">
          <label className="field-label">Default quick-add column</label>
          <select
            className="select-input"
            value={draft.defaultQuickAddColumnId || ""}
            onChange={(event) =>
              setDraft({ ...draft, defaultQuickAddColumnId: event.target.value || null })
            }
          >
            <option value="">First column</option>
            {state.columns
              .filter((column) => !draft.defaultProjectId || column.projectId === draft.defaultProjectId)
              .map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
          </select>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.confirmBeforeDelete}
            onChange={(event) => setDraft({ ...draft, confirmBeforeDelete: event.target.checked })}
          />
          Confirm before delete
        </label>

        <div className="field-stack">
          <label className="field-label">Attachments</label>
          <input className="text-input" readOnly value={draft.attachmentStorageLocation} />
        </div>
        <div className="field-stack">
          <label className="field-label">Backups</label>
          <input className="text-input" readOnly value={draft.backupLocation} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a className="text-button" href="/api/backup/export">
            <Download size={16} />
            Export
          </a>
          <label className="text-button cursor-pointer">
            <Upload size={16} />
            Import
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImport(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <div className="modal-footer">
        <button className="text-button" onClick={onClose}>
          <X size={16} />
          Close
        </button>
        <button className="text-button primary" onClick={() => void onSave(draft)}>
          {draft.theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
          Save
        </button>
      </div>
    </aside>
  );
}

function PendingUploadModal({
  pending,
  columns,
  onClose,
  onSubmit
}: {
  pending: PendingUpload;
  columns: BoardColumn[];
  onClose: () => void;
  onSubmit: (title: string, columnId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState(pending.columnId || columns[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => inputRef.current?.focus(), []);

  async function submit() {
    if (!columnId || busy) return;
    setBusy(true);
    try {
      await onSubmit(title, columnId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="modal-header">
          <div className="font-semibold">Screenshot Task</div>
          <button className="icon-button" type="button" title="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {pending.urls.slice(0, 3).map((url) => (
              <div key={url} className="attachment-preview">
                <img alt="Clipboard image" src={url} />
              </div>
            ))}
          </div>
          <div className="field-stack">
            <label className="field-label">Title</label>
            <input
              ref={inputRef}
              className="text-input"
              placeholder="Untitled screenshot task"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Column</label>
            <select
              className="select-input"
              value={columnId}
              onChange={(event) => setColumnId(event.target.value)}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="text-button" type="button" onClick={onClose}>
            <X size={16} />
            Cancel
          </button>
          <button className="text-button primary" type="submit" disabled={busy}>
            <Clipboard size={16} />
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function NewProjectModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(name.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div className="font-semibold">New Project</div>
          <button type="button" className="icon-button" title="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <div className="modal-body">
          <input
            autoFocus
            className="text-input"
            placeholder="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="text-button" onClick={onClose}>
            <X size={16} />
            Cancel
          </button>
          <button className="text-button primary" disabled={busy || !name.trim()}>
            <Plus size={16} />
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectIcon({ project, size = "normal" }: { project: Project; size?: "normal" | "large" }) {
  const style = {
    "--project-color": project.color
  } as CSSProperties;
  const className = clsx("project-icon", size === "large" && "project-icon-large");

  if (project.iconType === "upload" && project.iconPath) {
    return (
      <span className={className} style={style}>
        <img alt="" src={`/api/files/project-icons/${project.id}`} />
      </span>
    );
  }

  if (project.iconType === "built_in" && project.iconValue) {
    const IconComponent = BUILT_IN_ICONS[project.iconValue] || FolderKanban;
    return (
      <span className={className} style={style}>
        <IconComponent size={size === "large" ? 24 : 16} />
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {project.iconValue || initials(project.name)}
    </span>
  );
}

function phaseForNewTask(filterPhaseId: string, activePhase: Phase | null) {
  if (filterPhaseId === "none") return null;
  if (filterPhaseId !== "all" && filterPhaseId !== "active") return filterPhaseId;
  return activePhase?.id || null;
}

function filesFromDataTransfer(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.files || []).filter(isImageFile);
}

function imageFilesFromClipboard(event: ClipboardEvent) {
  const files: File[] = [];
  const items = Array.from(event.clipboardData?.items || []);

  items.forEach((item, index) => {
    if (!item.type.startsWith("image/")) return;
    const file = item.getAsFile();
    if (!file) return;
    files.push(
      new File([file], file.name || `clipboard-${Date.now()}-${index + 1}.png`, {
        type: file.type || "image/png"
      })
    );
  });

  return files;
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(file.name || "")
  );
}

function priorityClass(priority: Priority) {
  return clsx(
    "pill",
    priority === "Urgent" && "priority-urgent",
    priority === "High" && "priority-high"
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PF"
  );
}

async function readError(response: Response) {
  try {
    const payload = await response.json();
    return payload.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

function isStateEnvelope(payload: unknown): payload is { state: AppState } {
  return Boolean(payload && typeof payload === "object" && "state" in payload);
}

async function moveColumn(
  column: BoardColumn,
  direction: -1 | 1,
  columns: BoardColumn[],
  requestState: (url: string, init?: RequestInit) => Promise<AppState>,
  setError: (message: string | null) => void
) {
  const index = columns.findIndex((item) => item.id === column.id);
  const target = columns[index + direction];
  if (!target) return;

  try {
    await requestState("/api/columns", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ columnId: column.id, orderIndex: target.orderIndex })
    });
    await requestState("/api/columns", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ columnId: target.id, orderIndex: column.orderIndex })
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to reorder columns");
  }
}

async function importBackup(
  file: File,
  applyApiResult: (payload: unknown) => AppState,
  setToast: (message: string | null) => void,
  setError: (message: string | null) => void
) {
  try {
    const form = new FormData();
    form.set("backup", file, file.name);
    const response = await fetch("/api/backup/import", { method: "POST", body: form });
    if (!response.ok) throw new Error(await readError(response));
    applyApiResult(await response.json());
    setToast("Backup imported");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to import backup");
  }
}

async function copyTaskWithImages(title: string, description: string, notes: string, attachments: Attachment[]) {
  const text = `Task: ${title}\nDescription: ${description || "None"}${notes ? `\nNotes: ${notes}` : ''}`;
  
  if (!navigator.clipboard || !navigator.clipboard.write) {
    void navigator.clipboard?.writeText?.(text);
    return;
  }

  const imageAttachments = attachments.filter(a => a.fileType.startsWith("image/"));
  if (imageAttachments.length === 0) {
    void navigator.clipboard.writeText(text);
    return;
  }

  try {
    const fetchAsPngBlob = (url: string): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("No canvas context"));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Blob conversion failed"));
          }, "image/png");
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      });
    };

    const blobs = await Promise.all(imageAttachments.map(a => fetchAsPngBlob(a.url)));
    const items: ClipboardItem[] = [];
    
    // First item contains text + first image
    if (blobs.length > 0) {
      items.push(new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "image/png": blobs[0]
      }));

      // Subsequent items contain just the other images
      for (let i = 1; i < blobs.length; i++) {
        items.push(new ClipboardItem({
          "image/png": blobs[i]
        }));
      }
      
      await navigator.clipboard.write(items);
    } else {
      await navigator.clipboard.writeText(text);
    }
  } catch (err) {
    console.error("Failed to copy with images", err);
    void navigator.clipboard.writeText(text);
  }
}
