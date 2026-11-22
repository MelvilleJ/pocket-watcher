import "server-only";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, sessions } from "@/lib/db/schema";

export const AUDIT_LOG_LIMIT = 300;

export async function listAuditLogs(userId: string) {
  const [logs, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(AUDIT_LOG_LIMIT),
    db.select({ total: count() }).from(auditLogs).where(eq(auditLogs.userId, userId)),
  ]);
  return { logs, total };
}

export async function listSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastUsedAt))
    .limit(50);
}
