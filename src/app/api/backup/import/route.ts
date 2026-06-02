import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import AdmZip from "adm-zip";

import { fail, ok } from "@/lib/api";
import {
  closeDb,
  getAppState,
  getAttachmentRoot,
  getBackupRoot,
  getDatabasePath,
  getDb,
  getIconRoot
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("backup");
    if (!(file instanceof File)) throw new Error("Backup ZIP file is required");

    const buffer = Buffer.from(await file.arrayBuffer());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const staging = path.join(getBackupRoot(), `restore-${stamp}`);
    mkdirSync(staging, { recursive: true });

    const zip = new AdmZip(buffer);
    zip.extractAllTo(staging, true);

    const incomingDb = path.join(staging, "database", "projectflow.db");
    if (!existsSync(incomingDb)) {
      throw new Error("Backup does not contain database/projectflow.db");
    }

    getDb().exec("PRAGMA wal_checkpoint(FULL)");
    closeDb();

    const currentDb = getDatabasePath();
    if (existsSync(currentDb)) {
      copyFileSync(currentDb, path.join(getBackupRoot(), `pre-import-${stamp}.db`));
    }
    copyFileSync(incomingDb, currentDb);

    const incomingAttachments = path.join(staging, "attachments");
    if (existsSync(incomingAttachments)) {
      rmSync(getAttachmentRoot(), { recursive: true, force: true });
      cpSync(incomingAttachments, getAttachmentRoot(), { recursive: true });
    }

    const incomingIcons = path.join(staging, "icons");
    if (existsSync(incomingIcons)) {
      rmSync(getIconRoot(), { recursive: true, force: true });
      cpSync(incomingIcons, getIconRoot(), { recursive: true });
    }

    return ok({ state: getAppState(), restoredFrom: file.name });
  } catch (error) {
    return fail(error, 500);
  }
}
