
import { HealthResult } from '../../types';
import { Env } from "../../../types";
import { validateCloudflareToken } from "../../../utils/cloudflare";

export async function checkHealth(env: Env): Promise<HealthResult> {
    const start = Date.now();
    const token = env.CF_AIG_TOKEN;

    if (!token) {
        return {
            tool: 'ai-gateway',
            status: 'unhealthy',
            error: 'Missing CF_AIG_TOKEN',
            requiresAuth: true
        };
    }

    try {
        const isValid = await validateCloudflareToken(token);
        const latency = Date.now() - start;

        if (!isValid) {
            return {
                tool: 'ai-gateway',
                status: 'unhealthy',
                latencyMs: latency,
                error: 'Token verification failed',
                requiresAuth: true
            };
        }

        return {
            tool: 'ai-gateway',
            status: 'healthy',
            latencyMs: latency,
            requiresAuth: true
        };
    } catch (err) {
        return {
            tool: 'ai-gateway',
            status: 'unhealthy',
            error: (err as Error).message,
            requiresAuth: true
        };
    }
}
