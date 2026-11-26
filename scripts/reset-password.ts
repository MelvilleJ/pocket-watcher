import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authAccounts, users } from "@/lib/db/schema";

// Better Auth is configured to hash with bcrypt, so a bcrypt hash written here signs in normally.
function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

// Usage: npx tsx scripts/reset-password.ts <email> <new-password>
async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email> <new-password>");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const credential = and(eq(authAccounts.userId, user.id), eq(authAccounts.providerId, "credential"));
  const [existing] = await db.select({ id: authAccounts.id }).from(authAccounts).where(credential).limit(1);
  if (existing) {
    await db.update(authAccounts).set({ password: passwordHash, updatedAt: new Date() }).where(credential);
  } else {
    await db.insert(authAccounts).values({ userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash });
  }

  console.log(`Password reset for ${email}`);
  process.exit(0);
}

main();
