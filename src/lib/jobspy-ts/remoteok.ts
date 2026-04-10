import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

export class RemoteOkScraper extends BaseScraper {
    name = 'remoteok';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { limit = 50 } = options;
        // RemoteOK doesn't have a formalized search query param in their public API easily,
        // it returns all jobs. We'll filter them manually.
        const url = 'https://remoteok.com/api';

        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) return [];

            const data = await response.json();
            if (!Array.isArray(data)) return [];

            // data[0] is legal info, jobs start from data[1]
            const jobs = data.slice(1);
            
            const filteredJobs = jobs
                .filter((job: any) => {
                    const text = (job.position + ' ' + (job.tags?.join(' ') ?? '')).toLowerCase();
                    return text.includes(options.searchTerm.toLowerCase());
                })
                .slice(0, limit);

            return filteredJobs.map((job: any) => ({
                id: `remoteok-${job.id || Math.random()}`,
                title: job.position,
                company: job.company,
                location: job.location || 'Remote',
                url: job.url,
                source: 'remoteok',
                description: job.description,
                date_posted: job.date
            }));
        } catch (error) {
            console.error('RemoteOK scraping failed:', error);
            return [];
        }
    }
}
