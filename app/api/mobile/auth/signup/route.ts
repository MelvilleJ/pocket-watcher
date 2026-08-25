import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createMobileSession } from "@/lib/auth/mobile";
import { seedDefaultsForUser } from "@/lib/db/seed-defaults";
import { SignupSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  await seedDefaultsForUser(user.id);

  const deviceName = typeof body?.deviceName === "string" ? body.deviceName : undefined;
  const { token, expiresAt } = await createMobileSession(user.id, deviceName);

  return NextResponse.json({
    token,
    expiresAt,
    user: { id: user.id, name: user.name, email: user.email, currency: user.currency },
  });
}
