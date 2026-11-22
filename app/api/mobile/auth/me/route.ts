import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authenticateMobileRequest, unauthorized } from "@/lib/auth/mobile-request";
import { updateUserSettings } from "@/lib/settings";
import { SettingsSchema } from "@/lib/validation/entities";

export async function GET(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      currency: users.currency,
      savingsRate: users.savingsRate,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const session = await authenticateMobileRequest(request);
  if (!session) return unauthorized();

  const parsed = SettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your inputs." }, { status: 400 });

  const user = await updateUserSettings(session.userId, parsed.data, "mobile");
  revalidatePath("/dashboard", "layout");
  return NextResponse.json({ user });
}
