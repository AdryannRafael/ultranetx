import { env } from "@/enviroment";
import { DbException } from "@/src/shared/error/exceptions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30 * 1000,
  connectionTimeoutMillis: 2 * 1000,
});

export const db = drizzle({ client: pool });

export async function CheckDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    return true;
  } catch (e) {
    throw new DbException(
      "Não conseguiu estabeler uma conexão com o banco",
      "connection",
    );
  } finally {
    client.release();
  }
}
