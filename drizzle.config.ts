import { env } from "@/enviroment";
import { defineConfig } from "drizzle-kit";
import { join } from "path";

const path = join(".", "src", "infrastructure", "db", "schema", "*.ts");
export default defineConfig({
  // schema: "./src/db/schema/*.ts",
  // schema: path,
  schema: "./src/db/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
