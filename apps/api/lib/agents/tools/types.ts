export interface HealthResult {
    tool: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs?: number;
    error?: string;
    requiresAuth: boolean;
}
