import { and, eq, relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";
import { healthTestDefinitions } from "./health_test_definitions";

// --- Schema ---

export const healthIncidents = sqliteTable("health_incidents", {
  id: text("id").primaryKey(),
  definitionId: text("definition_id").references(() => healthTestDefinitions.id, { onDelete: "set null" }),
  name: text("name"),
  openedAt: integer("openedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  resolvedAt: integer("resolvedAt", { mode: "timestamp" }),
  lastError: text("lastError"),
  count: integer("count").notNull().default(1),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const healthIncidentsRelations = relations(healthIncidents, ({ one }) => ({
  definition: one(healthTestDefinitions, {
    fields: [healthIncidents.definitionId],
    references: [healthTestDefinitions.id],
  }),
}));

// --- Logic ---

export async function findActiveIncident(env: Env, definitionId: string) {
    const db = getDb(env);
    return db.query.healthIncidents.findFirst({
        where: and(
            eq(healthIncidents.definitionId, definitionId),
            eq(healthIncidents.active, true)
        )
    });
}

export async function createIncident(env: Env, data: {
    definitionId: string;
    name: string;
    lastError: string;
}) {
    const db = getDb(env);
    const id = crypto.randomUUID();
    return db.insert(healthIncidents).values({
        id,
        definitionId: data.definitionId,
        name: data.name,
        lastError: data.lastError,
        active: true,
        openedAt: new Date(),
        count: 1
    }).returning();
}

export async function resolveIncident(env: Env, incidentId: string) {
    const db = getDb(env);
    return db.update(healthIncidents)
        .set({
            active: false,
            resolvedAt: new Date()
        })
        .where(eq(healthIncidents.id, incidentId))
        .returning();
}
