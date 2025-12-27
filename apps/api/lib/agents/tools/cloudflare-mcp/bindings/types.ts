export interface BindingConfig {
    id: string;
    name: string;
    type: 'kv_namespace' | 'd1_database' | 'r2_bucket' | 'service_binding';
}

export interface CreateBindingRequest {
    name: string;
    type: 'kv_namespace' | 'd1_database';
}

export interface CloudflareApiResponse<T> {
    success: boolean;
    errors: { code: number; message: string }[];
    messages: string[];
    result: T;
}

export interface BindingResult {
    id: string;
    name: string;
    type?: string;
}
