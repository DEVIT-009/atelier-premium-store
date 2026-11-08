import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

const DEFAULT_SECRET = "better-auth-secret-12345678901234567890";

// Better Auth only warns about weak secrets; a guessable one lets attackers
// forge signed session cookies, so production refuses to start with one.
// Entropy estimate matches Better Auth's own: log2(uniqueChars ^ length).
function requireStrongSecret(secret: string | undefined) {
  if (process.env.NODE_ENV !== "production") return secret;

  if (!secret || secret === DEFAULT_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is missing or uses the default value.");
  }
  const entropyBits = secret.length * Math.log2(new Set(secret).size);
  if (secret.length < 32 || entropyBits < 120) {
    throw new Error(
      "BETTER_AUTH_SECRET is too weak. Generate one with `openssl rand -base64 32`.",
    );
  }
  return secret;
}

export const auth = betterAuth({
  secret: requireStrongSecret(process.env.BETTER_AUTH_SECRET),
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // No email verification: sign-up signs the user straight in (autoSignIn)
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      // input: false is what stops users setting their own role through sign-up
      // or update-user. Only a manual database update makes someone an admin.
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
      // Set and cleared only by staff (src/lib/admin-users.ts)
      blockedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Blocking ends every session; this refuses new ones, so a blocked user
        // can't sign in. It runs after the password check, so it reveals
        // nothing to someone without the password.
        async before(session, ctx) {
          if (!ctx) return;
          // The internal adapter's type leaves out additional fields
          const found = (await ctx.context.internalAdapter.findUserById(session.userId)) as {
            blockedAt?: Date | null;
          } | null;
          if (found?.blockedAt) {
            throw APIError.from("FORBIDDEN", {
              message: "This account is blocked.",
              code: "ACCOUNT_BLOCKED",
            });
          }
        },
      },
    },
  },
  // In-memory counters are per serverless instance; keep them in Postgres.
  // Built-in rules already limit sign-in/sign-up to 3 requests per 10s.
  rateLimit: {
    storage: "database",
  },
  // Lets auth.api calls in Server Actions (sign out) set cookies. Keep last.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
