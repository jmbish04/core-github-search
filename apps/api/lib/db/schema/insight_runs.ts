import { eq, relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";
import { runs } from "./runs";

// --- Schema ---

export const insightRuns = sqliteTable("insight_runs", {
  runId: text("run_id").primaryKey().references(() => runs.id, { onDelete: "cascade" }),
  prevRunId: text("prev_run_id"),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  catalogPath: text("catalog_path"),
  anomaliesPath: text("anomalies_path"),
});

export const insightRunsRelations = relations(insightRuns, ({ one }) => ({
  run: one(runs, {
    fields: [insightRuns.runId],
    references: [runs.id],
  }),
}));

// --- Logic ---

export async function createInsightRun(
  env: Env,
  data: {
    run_id: string;
    prev_run_id?: string;
    catalog_path?: string;
    anomalies_path?: string;
  }
) {
  const db = getDb(env);
  await db.insert(insightRuns).values({
    runId: data.run_id,
    prevRunId: data.prev_run_id,
    catalogPath: data.catalog_path,
    anomaliesPath: data.anomalies_path,
    publishedAt: new Date(),
  });
}

export async function getInsightRun(env: Env, runId: string) {
  const db = getDb(env);
  return db.select().from(insightRuns).where(eq(insightRuns.runId, runId)).get();
}
