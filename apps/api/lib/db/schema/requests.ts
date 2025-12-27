import { eq, relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { getDb } from "../index";

// --- Schema Definitions ---

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  kind: text("kind"),
  method: text("method"),
  path: text("path"),
  query: text("query"),
  status: text("status").notNull().default("pending"), 
  errorText: text("error_text"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  test: integer("test", { mode: "boolean" }).notNull().default(false),
});

export const requestMeta = sqliteTable("request_meta", {
  requestId: text("request_id").primaryKey().references(() => requests.id, { onDelete: "cascade" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  progress: real("progress").notNull().default(0),
  statsJson: text("stats_json"),
});

export const requestLogs = sqliteTable("request_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  level: text("level").notNull(),
  message: text("message").notNull(),
  dataJson: text("data_json"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const requestResults = sqliteTable("request_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  entity: text("entity").notNull(),
  source: text("source"),
  canonicalKey: text("canonical_key"),
  rowJson: text("row_json").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// --- Relations ---

export const requestsRelations = relations(requests, ({ one, many }) => ({
  meta: one(requestMeta, {
    fields: [requests.id],
    references: [requestMeta.requestId],
  }),
  logs: many(requestLogs),
  results: many(requestResults),
}));

export const requestMetaRelations = relations(requestMeta, ({ one }) => ({
  request: one(requests, {
    fields: [requestMeta.requestId],
    references: [requests.id],
  }),
}));

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
  request: one(requests, {
    fields: [requestLogs.requestId],
    references: [requests.id],
  }),
}));

export const requestResultsRelations = relations(requestResults, ({ one }) => ({
  request: one(requests, {
    fields: [requestResults.requestId],
    references: [requests.id],
  }),
}));


// --- Logic / Data Access ---

/**
 * createRequest
 * Logs the start of a request.
 */
export async function createRequest(
    env: Env, 
    requestId: string,
    kind: string,
    req: Request,
    bodyText?: string
) {
    const db = getDb(env);
    const url = new URL(req.url);
    await db.insert(requests).values({
        id: requestId,
        kind,
        method: req.method,
        path: url.pathname,
        query: url.search,
        status: "pending",
        // test: false, // default
    });
}

/**
 * createRpcRequest
 * Wrapper for RPC calls
 */
export async function createRpcRequest(
    env: Env,
    requestId: string,
    method: string,
    params: any
) {
    const db = getDb(env);
    await db.insert(requests).values({
        id: requestId,
        kind: "rpc",
        method: "RPC", 
        path: method, // Store RPC method name in path
        query: "",
        status: "pending"
        // body not stored in schema currently based on previous implementation
    });
}

export async function queueRequest(env: Env, requestId: string) {
    const db = getDb(env);
    await db.update(requests)
        .set({ status: "queued" })
        .where(eq(requests.id, requestId));
}

export async function setRequestProgress(
    env: Env, 
    requestId: string, 
    progress: number, 
    stats?: any
) {
    const db = getDb(env);
    const statsJson = stats ? JSON.stringify(stats) : undefined;
    
    // SQLite upsert
    await db.insert(requestMeta)
        .values({
            requestId,
            progress,
            statsJson,
            updatedAt: new Date() 
        })
        .onConflictDoUpdate({
            target: requestMeta.requestId,
            set: {
                progress,
                statsJson,
                updatedAt: new Date()
            }
        });
}

export async function updateRequestStatus(
    env: Env, 
    requestId: string, 
    status: string,
    errorText?: string
) {
    const db = getDb(env);
    await db.update(requests)
        .set({ 
            status,
            errorText: errorText || null
        })
        .where(eq(requests.id, requestId));
}

export async function getRequestStatusWithMeta(env: Env, requestId: string) {
    const db = getDb(env);
    const result = await db.query.requests.findFirst({
        where: eq(requests.id, requestId),
        with: {
            meta: true
        }
    });
    
    if (!result) return null;
    
    return {
        status: result.status,
        progress: result.meta?.progress || 0,
        stats_json: result.meta?.statsJson || null,
        error_text: result.errorText || null
    };
}

export async function appendLog(
    env: Env,
    requestId: string,
    level: string,
    message: string,
    data?: unknown
) {
    const db = getDb(env);
    await db.insert(requestLogs).values({
        requestId,
        level,
        message,
        dataJson: data ? JSON.stringify(data) : null,
        createdAt: new Date()
    });
}

export async function insertResult(
    env: Env,
    requestId: string,
    entity: string,
    row: unknown,
    source?: string,
    canonicalKey?: string
) {
    const db = getDb(env);
    await db.insert(requestResults).values({
        requestId,
        entity,
        source,
        canonicalKey,
        rowJson: JSON.stringify(row),
        createdAt: new Date()
    });
}
