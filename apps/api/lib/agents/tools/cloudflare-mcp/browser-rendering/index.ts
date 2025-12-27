import { Env } from "../../../types";

export const getConfig = (env: Env): any => ({
    name: "browser-rendering",
    url: "https://browser.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {
            "Authorization": `Bearer ${env.CF_BROWSER_RENDER_TOKEN}`
        }
    }
});
