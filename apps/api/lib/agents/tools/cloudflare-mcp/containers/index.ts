import { Env } from "../../../types";

export const getConfig = (env: Env): any => ({
    name: "cloudflare-containers",
    url: "https://containers.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_WORKER_ADMIN_TOKEN}`
        }
    }
});
