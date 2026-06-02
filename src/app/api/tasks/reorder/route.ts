import { fail, ok, readJson } from "@/lib/api";
import { getAppState, reorderTasks } from "@/lib/db";
import type { TaskOrderUpdate } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ updates?: TaskOrderUpdate[] }>(request);
    reorderTasks(body.updates || []);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
