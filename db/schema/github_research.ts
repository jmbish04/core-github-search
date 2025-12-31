
import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

// Sessions: id, user_id, created_at.
export const sessions = pgTable("sessions", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// Requests: id (uuid), query, status (pending, hitl, processing, completed), config (json - search base, min_stars, language), session_id.
export const githubRequests = pgTable("github_requests", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    query: text("query").notNull(),
    status: text("status").notNull().default("pending"),
    config: jsonb("config"),
    sessionId: text("session_id").notNull().references(() => sessions.id),
});

// HITL_Reviews: id, request_id, repo_snapshot_json, user_verdict (boolean), rationale (text), status (pending, reviewed).
export const hitlReviews = pgTable("hitl_reviews", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    requestId: text("request_id").notNull().references(() => githubRequests.id),
    repoSnapshotJson: jsonb("repo_snapshot_json"),
    userVerdict: boolean("user_verdict"),
    rationale: text("rationale"),
    status: text("status").notNull().default("pending"),
});

// Repo_Analysis: id, request_id, repo_url, agent_id, status (analyzing, complete), ai_ranking (int), ai_summary (text), ai_pros_cons (json), stars (int), tech_stack (json).
export const repoAnalysis = pgTable("repo_analysis", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    requestId: text("request_id").notNull().references(() => githubRequests.id),
    repoUrl: text("repo_url").notNull(),
    agentId: text("agent_id"),
    status: text("status").notNull().default("analyzing"),
    aiRanking: integer("ai_ranking"),
    aiSummary: text("ai_summary"),
    aiProsCons: jsonb("ai_pros_cons"),
    stars: integer("stars"),
    techStack: jsonb("tech_stack"),
});

// Favorites: id, user_id, repo_url, notes, is_active, timestamp.
export const favorites = pgTable("favorites", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").references(() => user.id),
    repoUrl: text("repo_url").notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// Tags: id, name, description, css_color, is_active.
export const tags = pgTable("tags", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    cssColor: text("css_color"),
    isActive: boolean("is_active").default(true).notNull(),
});

// Repo_Tags: id, tag_id, repo_url, timestamp, is_active.
export const repoTags = pgTable("repo_tags", {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    tagId: text("tag_id").notNull().references(() => tags.id),
    repoUrl: text("repo_url").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
});

// --- Relations ---

export const githubRequestsRelations = relations(githubRequests, ({ one, many }) => ({
    session: one(sessions, {
        fields: [githubRequests.sessionId],
        references: [sessions.id],
    }),
    hitlReviews: many(hitlReviews),
    repoAnalysis: many(repoAnalysis),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
    user: one(user, {
        fields: [sessions.userId],
        references: [user.id],
    }),
    githubRequests: many(githubRequests),
}));

export const hitlReviewsRelations = relations(hitlReviews, ({ one }) => ({
    request: one(githubRequests, {
        fields: [hitlReviews.requestId],
        references: [githubRequests.id],
    }),
}));

export const repoAnalysisRelations = relations(repoAnalysis, ({ one }) => ({
    request: one(githubRequests, {
        fields: [repoAnalysis.requestId],
        references: [githubRequests.id],
    }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    repoTags: many(repoTags),
}));

export const repoTagsRelations = relations(repoTags, ({ one }) => ({
    tag: one(tags, {
        fields: [repoTags.tagId],
        references: [tags.id],
    }),
}));
