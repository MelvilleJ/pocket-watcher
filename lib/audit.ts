import "server-only";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditAction = "create" | "update" | "delete";
type AuditSource = "web" | "mobile";

export async function recordAudit(params: {
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  source?: AuditSource;
}) {
  await db.insert(auditLogs).values({
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    before: params.before ?? null,
    after: params.after ?? null,
    source: params.source ?? "web",
  });
}
