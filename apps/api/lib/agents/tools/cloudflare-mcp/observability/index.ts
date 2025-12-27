import { Env } from "../../../types";

export const getConfig = (env: Env): any => ({
    name: "cloudflare-observability",
    url: "https://observability.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_OBSERVABILITY_TOKEN}`
        }
    }
});
