import path from "node:path";

import { fail } from "@/lib/api";
import { fileBufferInsideDataRoot, getProject } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

export async function GET(_request: Request, context: Params) {
  try {
    const { projectId } = await context.params;
    const project = getProject(projectId);
    if (!project?.iconPath) return fail(new Error("Project icon not found"), 404);
    const { buffer } = fileBufferInsideDataRoot(project.iconPath);
    const contentType =
      contentTypes[path.extname(project.iconPath).toLowerCase()] || "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=3600"
      }
    });
  } catch (error) {
    return fail(error, 500);
  }
}
