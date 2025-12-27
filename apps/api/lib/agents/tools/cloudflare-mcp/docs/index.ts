import { Env } from "../../../types";

export const getDocsTools = (env: Env) => {
    // Placeholder for Doc tools or MCP client integration
    return [
        "search_cloudflare_documentation"
    ];
};

export const getConfig = (env: Env): any => ({
    name: "cloudflare-docs",
    url: "https://docs.mcp.cloudflare.com/mcp",
    transport: {
        type: "streamable-http",
        headers: {}
    }
});

