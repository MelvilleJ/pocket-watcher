import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { applyImport } from "@/lib/data/portability";
import { DataFileSchema } from "@/lib/validation/data-file";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const entry = form?.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "Choose a Pocket Watcher export file (.json)." }, { status: 400 });
  }
  if (entry.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "That file is too large (max 25 MB)." }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await entry.text());
  } catch {
    return NextResponse.json({ error: "That file is not valid JSON." }, { status: 400 });
  }

  const validated = DataFileSchema.safeParse(parsed);
  if (!validated.success) {
    const detail = validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json(
      { error: `Not a Pocket Watcher export file${detail ? ` (${detail})` : ""}.` },
      { status: 400 }
    );
  }

  try {
    const { before, after } = await applyImport(user.id, validated.data);
    revalidatePath("/dashboard", "layout");
    return NextResponse.json({ ok: true, before, after });
  } catch (err) {
    console.error("import failed", err);
    return NextResponse.json(
      { error: "The import failed and your current data is untouched. Try again." },
      { status: 500 }
    );
  }
}
