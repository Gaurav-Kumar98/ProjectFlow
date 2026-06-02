import { fail, ok, readJson } from "@/lib/api";
import { getAppState, saveUploadedProjectIcon, updateProject } from "@/lib/db";
import type { IconType, ProjectStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, context: Params) {
  try {
    const { projectId } = await context.params;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("icon");
      if (!(file instanceof File)) throw new Error("Icon file is required");
      const buffer = Buffer.from(await file.arrayBuffer());
      saveUploadedProjectIcon({
        projectId,
        fileName: file.name,
        fileType: file.type,
        buffer
      });
      return ok(getAppState());
    }

    const body = await readJson<{
      name?: string;
      description?: string;
      iconType?: IconType;
      iconValue?: string | null;
      color?: string;
      status?: ProjectStatus;
    }>(request);
    updateProject(projectId, body);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
