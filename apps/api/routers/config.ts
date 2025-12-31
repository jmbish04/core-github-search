
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { searchConfigs } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppContext } from "../lib/context";

const app = new OpenAPIHono<AppContext>();

const configSchema = z.object({
    name: z.string(),
    config: z.any(),
    reposToAnalyze: z.number().optional(),
    isDefault: z.boolean().optional(),
});

// GET /configs
const listConfigsRoute = createRoute({
    method: "get",
    path: "/configs",
    responses: {
        200: {
            description: "A list of search configurations.",
            content: {
                "application/json": {
                    schema: z.array(configSchema),
                },
            },
        },
    },
    operationId: "listConfigs",
    summary: "List all search configurations.",
});

app.openapi(listConfigsRoute, async (c) => {
    const db = c.get("db");
    const configs = await db.query.searchConfigs.findMany();
    return c.json(configs);
});

// POST /configs
const createConfigRoute = createRoute({
    method: "post",
    path: "/configs",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: configSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Search configuration created successfully.",
        },
    },
    operationId: "createConfig",
    summary: "Create a new search configuration.",
});

app.openapi(createConfigRoute, async (c) => {
    const { name, config, reposToAnalyze, isDefault } = c.req.valid("json");
    const db = c.get("db");
    await db.insert(searchConfigs).values({ name, config, reposToAnalyze, isDefault });
    return c.json({ message: "Configuration created" }, 201);
});


// PUT /configs/{id}
const updateConfigRoute = createRoute({
    method: "put",
    path: "/configs/{id}",
    request: {
        params: z.object({
            id: z.string(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: configSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Search configuration updated successfully.",
        },
    },
    operationId: "updateConfig",
    summary: "Update a search configuration.",
});

app.openapi(updateConfigRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { name, config, reposToAnalyze, isDefault } = c.req.valid("json");
    const db = c.get("db");
    await db.update(searchConfigs).set({ name, config, reposToAnalyze, isDefault }).where(eq(searchConfigs.id, id));
    return c.json({ message: "Configuration updated" });
});


// DELETE /configs/{id}
const deleteConfigRoute = createRoute({
    method: "delete",
    path: "/configs/{id}",
    request: {
        params: z.object({
            id: z.string(),
        }),
    },
    responses: {
        200: {
            description: "Search configuration deleted successfully.",
        },
    },
    operationId: "deleteConfig",
    summary: "Delete a search configuration.",
});

app.openapi(deleteConfigRoute, async (c) => {
    const { id } = c.req.valid("param");
    const db = c.get("db");
    await db.delete(searchConfigs).where(eq(searchConfigs.id, id));
    return c.json({ message: "Configuration deleted" });
});


export const configRouter = app;
