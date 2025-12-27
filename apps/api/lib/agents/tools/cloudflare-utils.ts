import { Env } from '../types';

export const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export function getCfHeaders(env: Env): HeadersInit {
    if (!env.CLOUDFLARE_API_TOKEN) {
        throw new Error('Missing CLOUDFLARE_API_TOKEN in environment');
    }
    return {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
    };
}

export async function cfFetch<T>(
    env: Env,
    endpoint: string,
    init: RequestInit = {}
): Promise<T> {
    const url = `${CF_API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...init,
        headers: {
            ...getCfHeaders(env),
            ...init.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare API Error [${response.status}]: ${errorText}`);
    }

    const json = await response.json() as any;
    if (!json.success) {
        throw new Error(`Cloudflare API Failed: ${JSON.stringify(json.errors)}`);
    }

    return json.result as T;
}
