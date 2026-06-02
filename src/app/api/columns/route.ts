import { fail, ok, readJson } from "@/lib/api";
import { createColumn, deleteColumn, getAppState, updateColumn } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ projectId?: string; name?: string }>(request);
    if (!body.projectId) throw new Error("projectId is required");
    createColumn(body.projectId, body.name || "New Column");
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ columnId?: string; name?: string; orderIndex?: number }>(request);
    if (!body.columnId) throw new Error("columnId is required");
    updateColumn(body.columnId, body);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await readJson<{ columnId?: string; moveToColumnId?: string }>(request);
    if (!body.columnId) throw new Error("columnId is required");
    deleteColumn(body.columnId, body.moveToColumnId);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
