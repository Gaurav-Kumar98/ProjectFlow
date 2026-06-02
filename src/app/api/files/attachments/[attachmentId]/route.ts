import { fail } from "@/lib/api";
import { fileBufferInsideDataRoot, getAttachment } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ attachmentId: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const { attachmentId } = await context.params;
    const attachment = getAttachment(attachmentId);
    if (!attachment) return fail(new Error("Attachment not found"), 404);

    const { buffer } = fileBufferInsideDataRoot(attachment.filePath);
    return new Response(buffer, {
      headers: {
        "content-type": attachment.fileType || "application/octet-stream",
        "cache-control": "private, max-age=3600"
      }
    });
  } catch (error) {
    return fail(error, 500);
  }
}
