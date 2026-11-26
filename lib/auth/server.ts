import "server-only";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { db } from "@/lib/db";
import { authAccounts, authPasskeys, authSessions, authVerifications, users } from "@/lib/db/schema";
import { seedDefaultsForUser } from "@/lib/db/seed-defaults";
import { sendEmail } from "@/lib/email/sender";

const OTP_SUBJECTS = {
  "sign-in": "Your Pocket Watcher sign-in code",
  "email-verification": "Verify your Pocket Watcher email",
  "forget-password": "Reset your Pocket Watcher password",
  "change-email": "Confirm your new Pocket Watcher email",
} as const;

function createAuth(origin: string) {
  return betterAuth({
    appName: "Pocket Watcher",
    baseURL: origin,
    secret: process.env.SESSION_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
        passkey: authPasskeys,
      },
    }),
    advanced: { database: { generateId: false } },
    databaseHooks: {
      user: { create: { after: async (user) => void (await seedDefaultsForUser(user.id)) } },
    },
    plugins: [
      // Passwordless: an emailed code both signs people in and creates new accounts (with the name they gave).
      emailOTP({
        expiresIn: 600,
        async sendVerificationOTP({ email, otp, type }) {
          await sendEmail({
            to: email,
            subject: OTP_SUBJECTS[type],
            text: `Your Pocket Watcher code is ${otp}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
          });
        },
      }),
      passkey({ rpID: new URL(origin).hostname, rpName: "Pocket Watcher", origin }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const instances = new Map<string, Auth>();
const MAX_INSTANCES = 20;

function isPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

// Passkeys are bound to the site's hostname, so each address the app is reached on gets its own instance.
// That keeps localhost, LAN and the public domain all working without configuring a base URL anywhere.
export function originFromHeaders(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const hostname = host.split(":")[0];
  // Public hosts are only ever served over HTTPS (passkeys and push require it); proxies often drop the protocol.
  const proto = isPrivateHost(hostname) ? (requestHeaders.get("x-forwarded-proto") ?? "http") : "https";
  return `${proto}://${host}`;
}

export function authFor(origin: string): Auth {
  let instance = instances.get(origin);
  if (!instance) {
    if (instances.size >= MAX_INSTANCES) instances.delete(instances.keys().next().value!);
    instance = createAuth(origin);
    instances.set(origin, instance);
  }
  return instance;
}

export async function getAuth() {
  return authFor(originFromHeaders(await headers()));
}
