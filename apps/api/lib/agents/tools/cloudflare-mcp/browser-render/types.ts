export interface ScreenshotOptions {
    width?: number;
    height?: number;
    fullPage?: boolean;
}

export interface BrowserResponse {
    content: string;
    title?: string;
    screenshot?: string; // base64
}
