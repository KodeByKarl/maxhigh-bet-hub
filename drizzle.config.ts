import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      `mysql://${process.env.MYSQL_USER ?? "root"}:${process.env.MYSQL_PASSWORD ?? ""}@${process.env.MYSQL_HOST ?? "127.0.0.1"}:${process.env.MYSQL_PORT ?? "3306"}/${process.env.MYSQL_DATABASE ?? "maxhigh"}`,
  },
});
