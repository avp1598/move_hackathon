import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.OUTCOME_DB_PATH ?? "./.data/outcome-fi.sqlite",
  },
});
