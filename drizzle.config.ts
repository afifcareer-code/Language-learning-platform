import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/server/db/schema.ts",
  out: "./database/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./.data/app.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
