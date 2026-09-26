import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// bcryptjs directly (not lib/auth/password.ts) since that file is marked "server-only" for Next.js.
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

  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ id: users.id });

  if (!updated) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`Password reset for ${email}`);
  process.exit(0);
}

main();
