export interface ScrapedJob {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    description?: string;
    salary?: string;
    job_type?: string;
    date_posted?: string;
}

export interface ScrapingOptions {
    searchTerm: string;
    location?: string;
    limit?: number;
    remoteOnly?: boolean;
}

export abstract class BaseScraper {
    abstract name: string;
    abstract scrape(options: ScrapingOptions): Promise<ScrapedJob[]>;

    protected async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    }
}
