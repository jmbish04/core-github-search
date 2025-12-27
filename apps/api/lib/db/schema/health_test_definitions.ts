import { eq, relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";

// --- Schema ---

export const healthTestDefinitions = sqliteTable("health_test_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  target: text("target").notNull(),
  method: text("method").notNull().default("GET"),
  expectedStatus: integer("expectedStatus").notNull().default(200),
  frequencySeconds: integer("frequencySeconds").notNull().default(60),
  criticality: text("criticality").notNull().default("medium"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const healthTestDefinitionsRelations = relations(healthTestDefinitions, ({ many }) => ({
  results: many(healthTestResults), // Will need lazy import if strictly typed relations across files
  incidents: many(healthIncidents),
}));

import { healthIncidents } from "./health_incidents";
import { healthTestResults } from "./health_test_results";


// --- Logic ---

export async function listHealthTests(env: Env) {
    const db = getDb(env);
    return db.select().from(healthTestDefinitions).all();
}

export async function getHealthTestByName(env: Env, name: string) {
    const db = getDb(env);
    return db.select().from(healthTestDefinitions).where(eq(healthTestDefinitions.name, name)).get();
}

export async function createHealthTestDefinition(env: Env, data: {
    id?: string;
    name: string;
    target: string;
    method?: string;
    expectedStatus?: number;
    frequencySeconds?: number;
    criticality?: string;
    enabled?: boolean;
}) {
    const db = getDb(env);
    const id = data.id || crypto.randomUUID();
    await db.insert(healthTestDefinitions).values({
        id,
        name: data.name,
        target: data.target,
        method: data.method || "GET",
        expectedStatus: data.expectedStatus || 200,
        frequencySeconds: data.frequencySeconds || 60,
        criticality: data.criticality || "medium",
        enabled: data.enabled !== undefined ? data.enabled : true,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { id, ...data };
}
