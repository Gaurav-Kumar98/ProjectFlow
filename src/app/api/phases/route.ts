import { fail, ok, readJson } from "@/lib/api";
import { createPhase, getAppState, updatePhase } from "@/lib/db";
import type { PhaseStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      projectId?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    }>(request);
    if (!body.projectId) throw new Error("projectId is required");
    createPhase({
      projectId: body.projectId,
      name: body.name || "New Phase",
      description: body.description,
      isActive: body.isActive
    });
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{
      phaseId?: string;
      name?: string;
      description?: string;
      status?: PhaseStatus;
      isActive?: boolean;
      orderIndex?: number;
    }>(request);
    if (!body.phaseId) throw new Error("phaseId is required");
    updatePhase(body.phaseId, body);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
