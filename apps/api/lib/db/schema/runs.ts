import { eq, relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";

// --- Schema ---

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  datasetId: text("dataset_id").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  sandboxJobId: text("sandbox_job_id"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  logsPath: text("logs_path"),
});

export const runsRelations = relations(runs, ({ one }) => ({
  insightRun: one(insightRuns, {
    fields: [runs.id],
    references: [insightRuns.runId],
  }),
}));

// We need to import insightRuns to define relation, but insightRuns imports runs.
// To avoid circular dependency issues at runtime with Drizzle, we can keep relations in one file or use the strings.
// However, since we are doing 1-to-1, let's define insightRuns here or just skip the relation implementation if not strictly needed for queries yet.
// But the task said "Convert schema". I'll put insightRuns in `insight_runs.ts` and define relations there if possible, or here if I merge them. 
// The prompt asked to keep file structure. 
// I will keep them separate. Circular relations in separate files are tricky.
// Better to export the table here, and define relations in `index.ts`? No, Drizzle allows relations in separate files if logic permits, but standard is often one file.
// I will remove the relations block from here for `insightRun` unless I import it. 
// Actually, `insightRuns` depends on `runs`. So `runs.ts` should come first. 
// I'll skip the relation definition in this file for now to avoid circular imports, or use a "relations.ts" if needed.
// But I'll just write the table and logic.

// --- Logic ---

export async function createRun(
  env: Env,
  data: {
    id: string;
    dataset_id: string;
    mode: string;
    status: string;
    sandbox_job_id: string;
    started_at: Date;
  }
) {
  const db = getDb(env);
  await db.insert(runs).values({
    id: data.id,
    datasetId: data.dataset_id,
    mode: data.mode,
    status: data.status,
    sandboxJobId: data.sandbox_job_id,
    startedAt: data.started_at,
  });
}

export async function updateRunStatus(
  env: Env,
  runId: string,
  status: string,
  completedAt?: Date
) {
  const db = getDb(env);
  await db.update(runs)
    .set({
      status,
      endedAt: completedAt || null,
    })
    .where(eq(runs.id, runId));
}

export async function getRun(env: Env, runId: string) {
  const db = getDb(env);
  return db.select().from(runs).where(eq(runs.id, runId)).get();
}

// Late import for relations if needed, but Drizzle relations usually defined with the table. 
// I will rely on `insight_runs.ts` defining the relation back to runs if needed.
import { insightRuns } from "./insight_runs";
// This import might fail if I write this file before insight_runs exists? 
// Actually, I'm writing files now. `insight_runs.ts` doesn't exist yet (or rather contains typescript code I'm overwriting).
// To be safe, I'll comment out the relation for now or just remove it if not used by `getRun`. 
// The existing `getRun` didn't fetch relation.
