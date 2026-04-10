import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

export class BdJobsScraper extends BaseScraper {
    name = 'bdjobs';
    private baseUrl = 'https://jobs.bdjobs.com';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const params = new URLSearchParams({
            hidJobSearch: 'jobsearch',
            txtsearch: options.searchTerm
        });

        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/jobsearch.asp?${params.toString()}`, {
                headers: {
                    'user-agent': this.userAgent,
                    'referer': 'https://jobs.bdjobs.com/'
                }
            });
            if (!response.ok) return [];
            const doc = this.parseHtml(await response.text());
            if (!doc) return [];

            const cards = Array.from(doc.querySelectorAll('div.job-item, div.sout-jobs-wrapper, div.norm-jobs-wrapper, div.featured-wrap'));
            return cards.slice(0, options.limit ?? 30).map((card, index): ScrapedJob | null => {
                const link = Array.from(card.querySelectorAll('a')).find(anchor => anchor.getAttribute('href')?.toLowerCase().includes('jobdetail')) as HTMLAnchorElement | undefined;
                if (!link) return null;
                const url = this.absoluteUrl(this.baseUrl, link.getAttribute('href'));
                const company = this.text(card.querySelector('[class*="comp-name"], [class*="company"]')) || 'Unknown Company';
                const location = this.text(card.querySelector('[class*="locon"], [class*="location"], [class*="area"]')) || 'Bangladesh';
                return {
                    id: `bdjobs-${url || index}`,
                    title: this.text(link) || 'Unknown Title',
                    company,
                    location,
                    url,
                    source: 'bdjobs',
                    remote: [this.text(link), location].join(' ').toLowerCase().includes('remote')
                };
            }).filter((job): job is ScrapedJob => Boolean(job));
        } catch (error) {
            console.error('BDJobs scraping failed:', error);
            return [];
        }
    }
}
