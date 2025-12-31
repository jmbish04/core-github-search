
import { relations, sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const searchConfigs = pgTable("search_configs", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull().unique(),
    config: jsonb("config").notNull(),
    reposToAnalyze: integer("repos_to_analyze").default(20).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SearchConfig = typeof searchConfigs.$inferSelect;
export type NewSearchConfig = typeof searchConfigs.$inferInsert;
