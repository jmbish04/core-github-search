
/**
 * @file Cloudflare Workers entrypoint.
 *
 * Initializes database and auth context, then mounts the core Hono app.
 */

import { Hono } from "hono";
import app from "./lib/app.js";
import { createAuth } from "./lib/auth.js";
import type { AppContext } from "./lib/context.js";
import { createDb } from "./lib/db.js";
import type { Env } from "./lib/env.js";
import { OrchestratorAgent } from "./lib/agents/orchestrator.js";
import { GithubAnalystAgent } from "./lib/agents/analyst.js";
import { JudgeAgent } from "./lib/agents/judge.js";


type CloudflareEnv = {
  HYPERDRIVE_CACHED: Hyperdrive;
  HYPERDRIVE_DIRECT: Hyperdrive;
} & Env;

// Create a Hono app with Cloudflare Workers context
const worker = new Hono<{
  Bindings: CloudflareEnv;
  Variables: AppContext["Variables"];
}>();

// Initialize shared context for all requests
worker.use("*", async (c, next) => {
  // Initialize database using Neon via Hyperdrive
  const db = createDb(c.env.HYPERDRIVE_CACHED);
  const dbDirect = createDb(c.env.HYPERDRIVE_DIRECT);

  // Initialize auth
  const auth = createAuth(db, c.env);

  // Set context variables
  c.set("db", db);
  c.set("dbDirect", dbDirect);
  c.set("auth", auth);

  await next();
});


worker.get("/api/agent/connect", (c) => {
    const requestId = c.req.query("requestId");
    if (!requestId) {
        return c.json({ error: "requestId is required" }, 400);
    }

    const orchestrator = c.env.ORCHESTRATOR.get(
        c.env.ORCHESTRATOR.idFromName(requestId),
    );
    return orchestrator.fetch(c.req.raw);
});


// Mount the core API app
worker.route("/", app);

export default worker;

export { OrchestratorAgent, GithubAnalystAgent, JudgeAgent };
