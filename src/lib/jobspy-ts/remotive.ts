import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

export class RemotiveScraper extends BaseScraper {
    name = 'remotive';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { searchTerm, limit = 50 } = options;
        const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(searchTerm)}`;

        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) return [];

            const data = await response.json();
            const jobs = (data.jobs || []).slice(0, limit);

            return jobs.map((job: any) => ({
                id: `remotive-${job.id}`,
                title: job.title,
                company: job.company_name,
                location: job.candidate_required_location || 'Remote',
                url: job.url,
                source: 'remotive',
                description: job.description,
                salary: job.salary,
                job_type: job.job_type,
                date_posted: job.publication_date
            }));
        } catch (error) {
            console.error('Remotive scraping failed:', error);
            return [];
        }
    }
}
