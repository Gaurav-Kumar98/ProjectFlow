import { fail, ok, readJson } from "@/lib/api";
import { getAppState, restoreTasks } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ taskIds?: string[] }>(request);
    if (!body.taskIds || !Array.isArray(body.taskIds)) {
      throw new Error("taskIds array is required");
    }
    restoreTasks(body.taskIds);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
