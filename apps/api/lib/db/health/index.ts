import { sql } from "drizzle-orm";

import { getDb } from "../index";

export async function checkDatabaseHealth(env: Env) {
  const db = getDb(env);
  try {
    // Simple query to verify connectivity
    await db.run(sql`SELECT 1`);
    return { status: "OK" };
  } catch (e) {
    return { status: "FAILURE", error: String(e) };
  }
}
