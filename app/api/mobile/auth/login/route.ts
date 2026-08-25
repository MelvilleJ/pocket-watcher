import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createMobileSession } from "@/lib/auth/mobile";
import { LoginSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const deviceName = typeof body?.deviceName === "string" ? body.deviceName : undefined;
  const { token, expiresAt } = await createMobileSession(user.id, deviceName);

  return NextResponse.json({
    token,
    expiresAt,
    user: { id: user.id, name: user.name, email: user.email, currency: user.currency },
  });
}
