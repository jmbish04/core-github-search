import { checkHealth as checkHealthFn } from "./health";

import * as CloudflareDocs from "./cloudflare-mcp/docs";
import * as AiGateway from "./cloudflare-mcp/ai-gateway";
import * as BrowserRendering from "./cloudflare-mcp/browser-rendering";
import * as AutoRag from "./cloudflare-mcp/autorag";
import * as CloudflareBindings from "./cloudflare-mcp/bindings";
import * as CloudflareBuilds from "./cloudflare-mcp/builds";
import * as CloudflareContainers from "./cloudflare-mcp/containers";
import * as CloudflareObservability from "./cloudflare-mcp/observability";
import * as CloudflareLogpush from "./cloudflare-mcp/logpush";
import * as AuditLogs from "./cloudflare-mcp/audit-logs";

export namespace Tools {
    export const checkHealth = checkHealthFn;

    export const getConfigs = (env: Env): any[] => {
        return [
            CloudflareDocs.getConfig(env),
            AiGateway.getConfig(env),
            BrowserRendering.getConfig(env),
            AutoRag.getConfig(env),
            CloudflareBindings.getConfig(env),
            CloudflareBuilds.getConfig(env),
            CloudflareContainers.getConfig(env),
            CloudflareObservability.getConfig(env),
            CloudflareLogpush.getConfig(env),
            AuditLogs.getConfig(env),
        ];
    }

    // Expose individual configs if needed
    export const Docs = CloudflareDocs.getConfig;
    export const AIGateway = AiGateway.getConfig;
    export const Browser = BrowserRendering.getConfig;
    export const AutoRAG = AutoRag.getConfig;
    export const Bindings = CloudflareBindings.getConfig;
    export const Builds = CloudflareBuilds.getConfig;
    export const Containers = CloudflareContainers.getConfig;
    export const Observability = CloudflareObservability.getConfig;
    export const Logpush = CloudflareLogpush.getConfig;
    export const AuditMessages = AuditLogs.getConfig;
}
