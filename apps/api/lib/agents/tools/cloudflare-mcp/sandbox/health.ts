import { Env } from "../../../types";

export async function checkHealth(env: Env) {
    if (!env.SANDBOX) {
        return { status: 'FAILURE', message: 'SANDBOX binding missing' };
    }
    return { status: 'OK' };
}
