import { Env } from "../../../types";

export const getConfig = (env: Env): any => ({
    name: "cloudflare-logpush",
    url: "https://logs.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_OBSERVABILITY_TOKEN}`
        }
    }
});
