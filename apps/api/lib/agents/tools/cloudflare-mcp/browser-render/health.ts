import { Env } from "../../../types";

export async function checkHealth(env: Env) {
    if (!env.CF_BROWSER_RENDER_TOKEN) {
        return { status: 'FAILURE', message: 'CF_BROWSER_RENDER_TOKEN is missing' };
    }
    return { status: 'OK' };
}
