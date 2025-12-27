import { Env } from "../types";
import { HealthResult } from "./types";

import * as CloudflareDocs from "./cloudflare-mcp/docs/health";
import * as AiGateway from "./cloudflare-mcp/ai-gateway/health";
import * as BrowserRendering from "./cloudflare-mcp/browser-rendering/health";
import * as AutoRag from "./cloudflare-mcp/autorag/health";
import * as CloudflareBindings from "./cloudflare-mcp/bindings/health";
import * as CloudflareBuilds from "./cloudflare-mcp/builds/health";
import * as CloudflareContainers from "./cloudflare-mcp/containers/health";
import * as CloudflareObservability from "./cloudflare-mcp/observability/health";
import * as CloudflareLogpush from "./cloudflare-mcp/logpush/health";
import * as AuditLogs from "./cloudflare-mcp/audit-logs/health";

export const HealthCheckers = [
    { name: "Cloudflare Docs", check: CloudflareDocs.checkHealth },
    { name: "AI Gateway", check: AiGateway.checkHealth },
    { name: "Browser Rendering", check: BrowserRendering.checkHealth },
    { name: "AutoRag", check: AutoRag.checkHealth },
    { name: "Bindings", check: CloudflareBindings.checkHealth },
    { name: "Builds", check: CloudflareBuilds.checkHealth },
    { name: "Containers", check: CloudflareContainers.checkHealth },
    { name: "Observability", check: CloudflareObservability.checkHealth },
    { name: "Logpush", check: CloudflareLogpush.checkHealth },
    { name: "Audit Logs", check: AuditLogs.checkHealth },
];

export async function checkHealth(env: Env): Promise<HealthResult[]> {
    return Promise.all(HealthCheckers.map(c => c.check(env)));
}


