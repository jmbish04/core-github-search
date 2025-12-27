
import { HealthResult } from '../../types';
import { Env } from "../../../types";
import { validateCloudflareToken } from "../../../utils/cloudflare";

export async function checkHealth(env: Env): Promise<HealthResult> {
    const start = Date.now();
    const token = env.CLOUDFLARE_OBSERVABILITY_TOKEN;

    if (!token) {
        return {
            tool: 'cloudflare-observability',
            status: 'unhealthy',
            error: 'Missing CLOUDFLARE_OBSERVABILITY_TOKEN',
            requiresAuth: true
        };
    }

    try {
        const isValid = await validateCloudflareToken(token);
        const latency = Date.now() - start;

        if (!isValid) {
            return {
                tool: 'cloudflare-observability',
                status: 'unhealthy',
                latencyMs: latency,
                error: 'Token verification failed',
                requiresAuth: true
            };
        }

        return {
            tool: 'cloudflare-observability',
            status: 'healthy',
            latencyMs: latency,
            requiresAuth: true
        };
    } catch (err) {
        return {
            tool: 'cloudflare-observability',
            status: 'unhealthy',
            error: (err as Error).message,
            requiresAuth: true
        };
    }
}
