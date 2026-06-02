import { ok } from "@/lib/api";

export const runtime = "nodejs";

export function GET() {
  return ok({ ok: true, app: "ProjectFlow", time: new Date().toISOString() });
}
