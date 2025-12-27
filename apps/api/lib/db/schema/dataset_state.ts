import { eq, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";

// --- Schema ---

export const datasetState = sqliteTable("dataset_state", {
  datasetId: text("dataset_id").primaryKey(),
  watermark: text("watermark"),
  watermarkUpdatedAt: integer("watermark_updated_at", { mode: "timestamp" }),
  lastRunId: text("last_run_id"),
  lastRowCountDelta: integer("last_row_count_delta").notNull().default(0),
  lastRowCountTotal: integer("last_row_count_total").notNull().default(0),
  bootstrapDone: integer("bootstrap_done", { mode: "boolean" }).notNull().default(false),
  metadata: text("metadata"), 
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// --- Logic ---

export async function getDatasetState(env: Env, datasetId: string) {
  const db = getDb(env);
  const result = await db.select().from(datasetState).where(eq(datasetState.datasetId, datasetId)).get();
  
  if (!result) return null;
  return result;
}

export async function updateDatasetState(
  env: Env,
  datasetId: string,
  data: {
    watermark?: string;
    lastRunId?: string;
    metadata?: any;
  }
) {
  const db = getDb(env);
  const metadataStr = data.metadata ? JSON.stringify(data.metadata) : undefined;
  
  await db.insert(datasetState)
    .values({
      datasetId,
      watermark: data.watermark,
      lastRunId: data.lastRunId,
      metadata: metadataStr,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: datasetState.datasetId,
      set: {
        watermark: data.watermark || undefined,
        lastRunId: data.lastRunId || undefined,
        metadata: metadataStr || undefined,
        updatedAt: new Date(),
      }
    });
}
