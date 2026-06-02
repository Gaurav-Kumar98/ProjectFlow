import { writeFileSync } from "node:fs";

import { fail, ok, readJson } from "@/lib/api";
import {
  createTask,
  deleteAttachment,
  getAppState,
  isSupportedImage,
  recordAttachment,
  safeAttachmentPath,
  sanitizeFileName
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const projectId = String(form.get("projectId") || "");
    const columnId = String(form.get("columnId") || "");
    const phaseIdValue = form.get("phaseId");
    const phaseId = phaseIdValue === null ? undefined : String(phaseIdValue) || null;
    const title = String(form.get("title") || "Untitled screenshot task");
    let taskId = String(form.get("taskId") || "");

    if (!taskId && !projectId) throw new Error("projectId is required when taskId is not provided");

    const files = form
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);
    const singleFile = form.get("file");
    if (singleFile instanceof File && singleFile.size > 0) files.push(singleFile);
    if (files.length === 0) throw new Error("At least one image file is required");

    if (!taskId) {
      taskId = createTask({
        projectId,
        columnId,
        phaseId,
        title
      });
    }

    for (const file of files) {
      if (!isSupportedImage(file.name, file.type)) {
        throw new Error(`Unsupported image type: ${file.name}`);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const destination = safeAttachmentPath(taskId, file.name, file.type);
      writeFileSync(destination, buffer);
      recordAttachment({
        taskId,
        fileName: sanitizeFileName(file.name),
        filePath: destination,
        thumbnailPath: destination,
        fileType: file.type || "application/octet-stream",
        fileSize: buffer.byteLength
      });
    }

    return ok({ state: getAppState(), taskId });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await readJson<{ attachmentId?: string }>(request);
    if (!body.attachmentId) throw new Error("attachmentId is required");
    deleteAttachment(body.attachmentId);
    return ok(getAppState());
  } catch (error) {
    return fail(error, 500);
  }
}
