import { fail, ok, readJson } from "@/lib/api";
import { createProject, getAppState } from "@/lib/db";
import type { IconType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      name?: string;
      description?: string;
      iconType?: IconType;
      iconValue?: string | null;
      color?: string;
    }>(request);
    createProject({
      name: body.name || "Untitled Project",
      description: body.description,
      iconType: body.iconType,
      iconValue: body.iconValue,
      color: body.color
    });
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
