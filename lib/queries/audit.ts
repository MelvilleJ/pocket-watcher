import "server-only";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, authSessions } from "@/lib/db/schema";

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
    .select({
      id: authSessions.id,
      userAgent: authSessions.userAgent,
      ipAddress: authSessions.ipAddress,
      createdAt: authSessions.createdAt,
      updatedAt: authSessions.updatedAt,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .where(and(eq(authSessions.userId, userId), gt(authSessions.expiresAt, new Date())))
    .orderBy(desc(authSessions.updatedAt))
    .limit(50);
}
