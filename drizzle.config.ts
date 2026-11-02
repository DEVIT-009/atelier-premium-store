import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// drizzle-kit only reads .env on its own; Next.js keeps secrets in .env.local
config({ path: [".env.local", ".env"], quiet: true });

export default {
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
