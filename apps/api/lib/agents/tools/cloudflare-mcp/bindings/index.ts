import { z } from "../../../utils/schema";
import { Env } from "../../../types";
import { cfFetch } from "../../cloudflare-utils";

export const getConfig = (env: Env): any => ({
    name: "cloudflare-bindings",
    url: "https://bindings.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_WORKER_ADMIN_TOKEN}`
        }
    }
});

/**
 * Cloudflare Bindings MCP Toolset
 * Enables agents to manage Workers, D1, KV, R2, and Hyperdrive resources via the Cloudflare API.
 */
export const getBindingTools = (env: Env) => {
    return [
        // -------------------------------------------------------------------------
        // ACCOUNT
        // -------------------------------------------------------------------------
        {
            name: "cf_account_list",
            description: "List all accounts the API token has access to.",
            parameters: z.object({}),
            execute: async () => {
                return cfFetch(env, "/accounts");
            },
        },

        // -------------------------------------------------------------------------
        // WORKERS
        // -------------------------------------------------------------------------
        {
            name: "cf_worker_list",
            description: "List all Workers/Scripts in the account.",
            parameters: z.object({}),
            execute: async () => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`);
            },
        },
        {
            name: "cf_worker_get",
            description: "Get details of a specific Cloudflare Worker.",
            parameters: z.object({
                scriptName: z.string().describe("The name of the worker script"),
            }),
            execute: async (args: { scriptName: string }) => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${args.scriptName}`);
            },
        },

        // -------------------------------------------------------------------------
        // KV NAMESPACES
        // -------------------------------------------------------------------------
        {
            name: "cf_kv_list",
            description: "List all KV namespaces.",
            parameters: z.object({}),
            execute: async () => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`);
            },
        },
        {
            name: "cf_kv_create",
            description: "Create a new KV namespace.",
            parameters: z.object({
                title: z.string().describe("A human-readable name for the namespace"),
            }),
            execute: async (args: { title: string }) => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`, {
                    method: "POST",
                    body: JSON.stringify({ title: args.title }),
                });
            },
        },

        // -------------------------------------------------------------------------
        // D1 DATABASES
        // -------------------------------------------------------------------------
        {
            name: "cf_d1_list",
            description: "List all D1 databases.",
            parameters: z.object({}),
            execute: async () => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database`);
            },
        },
        {
            name: "cf_d1_create",
            description: "Create a new D1 database.",
            parameters: z.object({
                name: z.string().describe("The name of the database"),
            }),
            execute: async (args: { name: string }) => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database`, {
                    method: "POST",
                    body: JSON.stringify({ name: args.name }),
                });
            },
        },
        {
            name: "cf_d1_query",
            description: "Execute a SQL query against a D1 database via the API.",
            parameters: z.object({
                databaseId: z.string().describe("The UUID of the D1 database"),
                sql: z.string().describe("The SQL query to execute"),
                params: z.array(z.string()).optional().describe("Query parameters"),
            }),
            execute: async (args: { databaseId: string; sql: string; params?: string[] }) => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${args.databaseId}/query`, {
                    method: "POST",
                    body: JSON.stringify({ sql: args.sql, params: args.params || [] }),
                });
            },
        },

        // -------------------------------------------------------------------------
        // R2 BUCKETS
        // -------------------------------------------------------------------------
        {
            name: "cf_r2_list",
            description: "List R2 buckets.",
            parameters: z.object({}),
            execute: async () => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets`);
            },
        },
        {
            name: "cf_r2_create",
            description: "Create a new R2 bucket.",
            parameters: z.object({
                name: z.string().describe("Name of the bucket"),
            }),
            execute: async (args: { name: string }) => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets`, {
                    method: "POST",
                    body: JSON.stringify({ name: args.name }),
                });
            },
        },

        // -------------------------------------------------------------------------
        // HYPERDRIVE
        // -------------------------------------------------------------------------
        {
            name: "cf_hyperdrive_list",
            description: "List Hyperdrive configurations.",
            parameters: z.object({}),
            execute: async () => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/hyperdrive/configs`);
            },
        },
        {
            name: "cf_hyperdrive_create",
            description: "Create a Hyperdrive configuration.",
            parameters: z.object({
                name: z.string(),
                origin: z.object({
                    host: z.string(),
                    port: z.number(),
                    database: z.string(),
                    user: z.string(),
                    password: z.string(),
                    scheme: z.enum(["postgres", "postgresql", "mysql"]),
                }),
            }),
            execute: async (args: { name: string; origin: any }) => {
                return cfFetch(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/hyperdrive/configs`, {
                    method: "POST",
                    body: JSON.stringify(args),
                });
            },
        },
    ];
};