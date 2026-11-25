import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/db";
import { appSecrets } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";

const PUBLIC = "vapid_public_key";
const PRIVATE = "vapid_private_key";
const ORIGIN = "app_origin";

let cached: { publicKey: string; privateKey: string } | null = null;

// Generated once on first use and kept in the database, so push works without any environment setup.
export async function getVapidKeys() {
  if (cached) return cached;
  const read = async () => {
    const rows = await db.select().from(appSecrets).where(inArray(appSecrets.key, [PUBLIC, PRIVATE]));
    const publicKey = rows.find((r) => r.key === PUBLIC)?.value;
    const privateKey = rows.find((r) => r.key === PRIVATE)?.value;
    return publicKey && privateKey ? { publicKey, privateKey: decryptSecret(privateKey) } : null;
  };
  let keys = await read();
  if (!keys) {
    const generated = webpush.generateVAPIDKeys();
    await db.transaction(async (tx) => {
      await tx.insert(appSecrets).values({ key: PUBLIC, value: generated.publicKey }).onConflictDoNothing();
      await tx.insert(appSecrets).values({ key: PRIVATE, value: encryptSecret(generated.privateKey) }).onConflictDoNothing();
    });
    keys = await read();
  }
  cached = keys;
  return keys!;
}

// Push services want a contact URL; the site's own address is the natural one and is learned when someone subscribes.
export async function rememberAppOrigin(origin: string) {
  await db
    .insert(appSecrets)
    .values({ key: ORIGIN, value: origin })
    .onConflictDoUpdate({ target: appSecrets.key, set: { value: origin } });
}

export async function getAppOrigin() {
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.key, ORIGIN)).limit(1);
  return row?.value ?? null;
}
