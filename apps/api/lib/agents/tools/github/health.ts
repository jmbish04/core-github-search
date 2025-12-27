import { Env } from "../../types";

export async function checkHealth(env: Env) {
    if (!env.GITHUB_TOKEN) {
        return { status: 'FAILURE', message: 'GITHUB_TOKEN is missing' };
    }
    // TODO: Perform a lightweight API call (e.g. user profile)
    return { status: 'OK' };
}
