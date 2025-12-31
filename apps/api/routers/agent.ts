
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { githubRequests, hitlReviews, sessions, repoAnalysis } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { AppContext } from "../lib/context";

const app = new OpenAPIHono<AppContext>();

const searchRequestSchema = z.object({
    query: z.string().openapi({
        description: "The natural language query for the GitHub search.",
        example: "Find me the best Cloudflare Worker libraries for authentication.",
    }),
    config: z.object({
        search_base: z.string().optional().openapi({
            description: "The base search pool to use.",
            example: "CLOUDFLARE_WORKER",
        }),
        min_stars: z.number().optional().openapi({
            description: "The minimum number of stars a repository must have.",
            example: 100,
        }),
        language: z.string().optional().openapi({
            description: "The primary programming language of the repository.",
            example: "typescript",
        }),
    }).optional(),
});

const searchRoute = createRoute({
    method: "post",
    path: "/search",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: searchRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Search initiated successfully.",
            content: {
                "application/json": {
                    schema: z.object({
                        message: z.string(),
                        requestId: z.string(),
                    }),
                },
            },
        },
    },
    operationId: "agentSearch",
    summary: "Initiate a new agentic GitHub search.",
});


app.openapi(searchRoute, async (c) => {
    const { query, config } = c.req.valid("json");
    const requestId = crypto.randomUUID();
    const db = c.get("db");
    let session = c.get("session");
    const orchestratorBinding = c.env.ORCHESTRATOR;

    if (!session) {
        const newSessionId = crypto.randomUUID();
        await db.insert(sessions).values({ id: newSessionId });
        session = { id: newSessionId, userId: null, createdAt: new Date() };
    }


    await db.insert(githubRequests).values({
        id: requestId,
        query,
        config: config ?? {},
        sessionId: session.id,
    });

    const orchestrator = orchestratorBinding.get(
        orchestratorBinding.idFromName(requestId),
    );

    c.executionCtx.waitUntil(orchestrator.start(requestId, query, config));

    return c.json({
        message: "Search initiated",
        requestId,
    });
});


// GET /agent/hitl/{requestId}
const getHitlRoute = createRoute({
    method: "get",
    path: "/hitl/{requestId}",
    request: {
        params: z.object({
            requestId: z.string().openapi({
                description: "The ID of the search request.",
            }),
        }),
    },
    responses: {
        200: {
            description: "A list of repositories needing human-in-the-loop review.",
            content: {
                "application/json": {
                    schema: z.array(z.object({
                        id: z.string(),
                        repoSnapshotJson: z.any(),
                    })),
                },
            },
        },
    },
    operationId: "getHitl",
    summary: "Get HITl reviews for a request.",
});

app.openapi(getHitlRoute, async (c) => {
    const { requestId } = c.req.valid("param");
    const db = c.get("db");
    const reviews = await db.query.hitlReviews.findMany({
        where: eq(hitlReviews.requestId, requestId),
    });
    return c.json(reviews.map(r => ({ id: r.id, repoSnapshotJson: r.repoSnapshotJson })));
});


// POST /agent/hitl/{requestId}/review
const reviewHitlRoute = createRoute({
    method: "post",
    path: "/hitl/{reviewId}/review",
    request: {
        params: z.object({
            reviewId: z.string().openapi({
                description: "The ID of the HITL review.",
            }),
        }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        userVerdict: z.boolean(),
                        rationale: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: "Review submitted successfully.",
            content: {
                "application/json": {
                    schema: z.object({
                        message: z.string(),
                    }),
                },
            },
        },
    },
    operationId: "reviewHitl",
    summary: "Submit a HITL review.",
});

app.openapi(reviewHitlRoute, async (c) => {
    const { reviewId } = c.req.valid("param");
    const { userVerdict, rationale } = c.req.valid("json");
    const db = c.get("db");
    const orchestratorBinding = c.env.ORCHESTRATOR;


    await db.update(hitlReviews).set({
        userVerdict,
        rationale: rationale ?? "",
        status: "reviewed",
    }).where(eq(hitlReviews.id, reviewId));


    const review = await db.query.hitlReviews.findFirst({
        where: eq(hitlReviews.id, reviewId),
    });

    if (review) {
        const allReviews = await db.query.hitlReviews.findMany({
            where: eq(hitlReviews.requestId, review.requestId),
        });

        const reviewedCount = allReviews.filter(r => r.status === "reviewed").length;

        if (allReviews.length === reviewedCount) {
            const orchestrator = orchestratorBinding.get(
                orchestratorBinding.idFromName(review.requestId),
            );

            c.executionCtx.waitUntil(orchestrator.continue(review.requestId));
        }
    }


    return c.json({ message: "Review submitted" });
});


// GET /results/{id}
const getResultsRoute = createRoute({
    method: "get",
    path: "/results/{requestId}",
    request: {
        params: z.object({
            requestId: z.string().openapi({
                description: "The ID of the search request.",
            }),
        }),
    },
    responses: {
        200: {
            description: "A list of repository analysis results.",
            content: {
                "application/json": {
                    schema: z.array(z.any()),
                },
            },
        },
    },
    operationId: "getResults",
    summary: "Get the results of a search request.",
});

app.openapi(getResultsRoute, async (c) => {
    const { requestId } = c.req.valid("param");
    const db = c.get("db");
    const results = await db.query.repoAnalysis.findMany({
        where: eq(repoAnalysis.requestId, requestId),
    });
    return c.json(results);
});


export const agentRouter = app;
