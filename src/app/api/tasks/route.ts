import { fail, ok, readJson } from "@/lib/api";
import { archiveTask, createTask, getAppState, updateTask } from "@/lib/db";
import type { Priority, TaskType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      projectId?: string;
      columnId?: string | null;
      phaseId?: string | null;
      title?: string;
      description?: string;
      notes?: string;
      taskType?: TaskType;
      priority?: Priority;
      tags?: string[];
    }>(request);
    if (!body.projectId) throw new Error("projectId is required");
    createTask({
      projectId: body.projectId,
      columnId: body.columnId,
      phaseId: body.phaseId,
      title: body.title || "Untitled task",
      description: body.description,
      notes: body.notes,
      taskType: body.taskType,
      priority: body.priority,
      tags: body.tags
    });
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{
      taskId?: string;
      title?: string;
      description?: string;
      notes?: string;
      phaseId?: string | null;
      columnId?: string;
      taskType?: TaskType;
      priority?: Priority;
      tags?: string[];
    }>(request);
    if (!body.taskId) throw new Error("taskId is required");
    updateTask(body.taskId, body);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await readJson<{ taskId?: string; taskIds?: string[] }>(request);
    if (body.taskIds && body.taskIds.length > 0) {
      body.taskIds.forEach((id) => archiveTask(id));
    } else if (body.taskId) {
      archiveTask(body.taskId);
    } else {
      throw new Error("taskId or taskIds is required");
    }
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
