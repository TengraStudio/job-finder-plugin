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
    remote?: boolean;
    skills?: string[];
}

export interface ScrapingOptions {
    searchTerm: string;
    location?: string;
    limit?: number;
    remoteOnly?: boolean;
    country?: string;
    sites?: string[];
}

export abstract class BaseScraper {
    abstract name: string;
    abstract scrape(options: ScrapingOptions): Promise<ScrapedJob[]>;

    protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

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

    protected parseHtml(html: string): Document | null {
        if (typeof DOMParser === 'undefined') return null;
        return new DOMParser().parseFromString(html, 'text/html');
    }

    protected text(element: Element | null | undefined): string {
        return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    }

    protected absoluteUrl(baseUrl: string, href: string | null | undefined): string {
        if (!href) return '#';
        try {
            return new URL(href, baseUrl).toString();
        } catch {
            return href;
        }
    }
}
