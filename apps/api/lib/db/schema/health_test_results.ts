import { desc, relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";
import { healthTestDefinitions } from "./health_test_definitions";

// --- Schema ---

export const healthTestResults = sqliteTable("health_test_results", {
  id: text("id").primaryKey(), // Using UUID usually or auto-increment? Original schema in SQL log said ID TEXT PRIMARY KEY.
  // Wait, SQL log for health_test_results said: "id" TEXT NOT NULL PRIMARY KEY.
  definitionId: text("definition_id").references(() => healthTestDefinitions.id, { onDelete: "set null" }),
  name: text("name"),
  ok: integer("ok", { mode: "boolean" }).notNull(),
  statusCode: integer("statusCode"),
  latencyMs: integer("latencyMs").notNull(),
  error: text("error"),
  aiSuggestion: text("ai_suggestion"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const healthTestResultsRelations = relations(healthTestResults, ({ one }) => ({
  definition: one(healthTestDefinitions, {
    fields: [healthTestResults.definitionId],
    references: [healthTestDefinitions.id],
  }),
}));


// --- Logic ---

export async function createHealthResult(env: Env, data: {
    definitionId?: string;
    name?: string;
    ok: boolean;
    statusCode?: number;
    latencyMs: number;
    error?: string;
    aiSuggestion?: string;
}) {
    const db = getDb(env);
    // Ensure we generate ID if TEXT PK
    const id = crypto.randomUUID();
    return db.insert(healthTestResults).values({
        id,
        definitionId: data.definitionId,
        name: data.name,
        ok: data.ok,
        statusCode: data.statusCode,
        latencyMs: data.latencyMs,
        error: data.error,
        aiSuggestion: data.aiSuggestion,
        createdAt: new Date()
    }).returning(); 
    // .returning() works in D1? Drizzle-orm supports it for D1 now mostly, or we assume void. 
    // The original prisma returned the result.
}

export async function getRecentResults(env: Env, limit: number = 50) {
    const db = getDb(env);
    return db.select().from(healthTestResults)
        .orderBy(desc(healthTestResults.createdAt))
        .limit(limit);
}
