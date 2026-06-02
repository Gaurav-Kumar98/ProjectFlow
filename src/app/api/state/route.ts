import { fail, ok, readJson } from "@/lib/api";
import { getAppState, markProjectOpened, updateSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ settings?: Partial<Settings>; lastOpenedProjectId?: string }>(
      request
    );
    if (body.lastOpenedProjectId) {
      markProjectOpened(body.lastOpenedProjectId);
    }
    if (body.settings) {
      updateSettings(body.settings);
    }
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
