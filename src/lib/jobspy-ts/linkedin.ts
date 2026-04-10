import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

export class LinkedInScraper extends BaseScraper {
    name = 'linkedin';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { searchTerm, location = 'Worldwide', limit = 20 } = options;
        const encodedSearch = encodeURIComponent(searchTerm);
        const encodedLocation = encodeURIComponent(location);
        
        // Using the public guest API endpoint which is less likely to block immediately
        const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodedSearch}&location=${encodedLocation}&start=0`;

        try {
            const response = await this.fetchWithTimeout(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) return [];

            const html = await response.text();
            return this.parseHtml(html, limit);
        } catch (error) {
            console.error('LinkedIn scraping failed:', error);
            return [];
        }
    }

    private parseHtml(html: string, limit: number): ScrapedJob[] {
        const jobs: ScrapedJob[] = [];
        // Note: In a real browser environment, we'd use DOMParser. 
        // For a desktop plugin, we might need a regex-based or manual parser if DOMParser isn't available,
        // but since this is a React UI component, DOMParser is available.

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('li');

        items.forEach((item, index) => {
            if (index >= limit) return;

            const titleEl = item.querySelector('.base-search-card__title');
            const companyEl = item.querySelector('.base-search-card__subtitle');
            const locationEl = item.querySelector('.job-search-card__location');
            const linkEl = item.querySelector('.base-card__full-link') as HTMLAnchorElement;
            const dateEl = item.querySelector('time');

            if (titleEl && companyEl) {
                jobs.push({
                    id: `linkedin-${Date.now()}-${index}`,
                    title: titleEl.textContent?.trim() ?? 'Unknown Title',
                    company: companyEl.textContent?.trim() ?? 'Unknown Company',
                    location: locationEl?.textContent?.trim() ?? 'Unknown Location',
                    url: linkEl?.href ?? '#',
                    source: 'linkedin',
                    date_posted: dateEl?.getAttribute('datetime') ?? undefined
                });
            }
        });

        return jobs;
    }
}
