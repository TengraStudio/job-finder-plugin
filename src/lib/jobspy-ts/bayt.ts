import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

export class BaytScraper extends BaseScraper {
    name = 'bayt';
    private baseUrl = 'https://www.bayt.com';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { searchTerm, limit = 30 } = options;
        const slug = encodeURIComponent(searchTerm.trim().replace(/\s+/g, '-'));
        const url = `${this.baseUrl}/en/international/jobs/${slug}-jobs/?page=1`;

        try {
            const response = await this.fetchWithTimeout(url, {
                headers: { 'user-agent': this.userAgent }
            });
            if (!response.ok) return [];
            const doc = this.parseHtml(await response.text());
            if (!doc) return [];

            return Array.from(doc.querySelectorAll('li[data-js-job]')).slice(0, limit).map((item, index): ScrapedJob => {
                const titleLink = item.querySelector('h2 a') as HTMLAnchorElement | null;
                const company = this.text(item.querySelector('div.t-nowrap span')) || 'Unknown Company';
                const location = this.text(item.querySelector('div.t-mute.t-small')) || 'International';
                return {
                    id: `bayt-${titleLink?.href || index}`,
                    title: this.text(titleLink) || 'Unknown Title',
                    company,
                    location,
                    url: this.absoluteUrl(this.baseUrl, titleLink?.getAttribute('href')),
                    source: 'bayt'
                };
            });
        } catch (error) {
            console.error('Bayt scraping failed:', error);
            return [];
        }
    }
}
