import { existsSync } from "node:fs";
import path from "node:path";

import AdmZip from "adm-zip";

import { fail } from "@/lib/api";
import {
  getAppState,
  getAttachmentRoot,
  getBackupRoot,
  getDatabasePath,
  getDb,
  getIconRoot
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    getDb().exec("PRAGMA wal_checkpoint(FULL)");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const zip = new AdmZip();
    const databasePath = getDatabasePath();

    if (existsSync(databasePath)) {
      zip.addLocalFile(databasePath, "database");
    }
    if (existsSync(getAttachmentRoot())) {
      zip.addLocalFolder(getAttachmentRoot(), "attachments");
    }
    if (existsSync(getIconRoot())) {
      zip.addLocalFolder(getIconRoot(), "icons");
    }

    zip.addFile(
      "projectflow-backup.json",
      Buffer.from(
        JSON.stringify(
          {
            app: "ProjectFlow",
            exportedAt: new Date().toISOString(),
            state: getAppState()
          },
          null,
          2
        )
      )
    );

    const buffer = zip.toBuffer();
    return new Response(buffer, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="projectflow-backup-${stamp}.zip"`,
        "cache-control": "no-store",
        "x-projectflow-backup-location": path.join(getBackupRoot(), `projectflow-backup-${stamp}.zip`)
      }
    });
  } catch (error) {
    return fail(error, 500);
  }
}
