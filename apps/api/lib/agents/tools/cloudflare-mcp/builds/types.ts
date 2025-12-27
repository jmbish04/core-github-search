export interface Deployment {
    id: string;
    number: string;
    status: string; // 'active' | 'success' | 'failure'
    url: string;
    created_on: string;
    latest_stage: {
        name: string;
        status: string;
    };
}
