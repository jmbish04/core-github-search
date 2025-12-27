import { Env } from "../../../types";

export const getConfig = (env: Env): any => ({
    name: "ai-gateway",
    url: "https://ai-gateway.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CF_AIG_TOKEN}`
        }
    }
});
