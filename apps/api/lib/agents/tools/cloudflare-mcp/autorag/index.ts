import { Env } from "../../../types";

export const getConfig = (env: Env): any => ({
    name: "autorag",
    url: "https://autorag.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_AI_SEARCH_TOKEN}`
        }
    }
});
