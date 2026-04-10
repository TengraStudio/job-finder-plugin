import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

const ZIP_HEADERS = {
    'accept': '*/*',
    'x-zr-zva-override': '100000000;vid:ZT1huzm_EQlDTVEc',
    'x-pushnotificationid': '0ff4983d38d7fc5b3370297f2bcffcf4b3321c418f5c22dd152a0264707602a0',
    'x-deviceid': 'D77B3A92-E589-46A4-8A39-6EF6F1D86006',
    'user-agent': 'Job Search/87.0 (iPhone; CPU iOS 16_6_1 like Mac OS X)',
    'authorization': 'Basic YTBlZjMyZDYtN2I0Yy00MWVkLWEyODMtYTI1NDAzMzI0YTcyOg==',
    'accept-language': 'en-US,en;q=0.9'
};

function formatLocation(job: any): string {
    return [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || 'Unknown';
}

function formatSalary(job: any): string | undefined {
    const min = job.compensation_min;
    const max = job.compensation_max;
    if (min == null && max == null) return undefined;
    const interval = job.compensation_interval === 'annual' ? 'yearly' : job.compensation_interval;
    return `${job.compensation_currency ? `${job.compensation_currency} ` : ''}${min ?? ''}${min != null && max != null ? ' - ' : ''}${max ?? ''}${interval ? ` / ${interval}` : ''}`.trim();
}

export class ZipRecruiterScraper extends BaseScraper {
    name = 'zip_recruiter';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { searchTerm, location = 'USA', limit = 40 } = options;
        const params = new URLSearchParams({
            search: searchTerm,
            location
        });
        if (options.remoteOnly) params.set('remote', '1');

        try {
            await this.fetchWithTimeout('https://api.ziprecruiter.com/jobs-app/event', {
                method: 'POST',
                headers: ZIP_HEADERS
            }, 6000).catch(() => undefined);

            const response = await this.fetchWithTimeout(`https://api.ziprecruiter.com/jobs-app/jobs?${params.toString()}`, {
                headers: ZIP_HEADERS
            });
            if (!response.ok) return [];
            const data = await response.json();
            const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

            return jobs.slice(0, limit).map((job: any): ScrapedJob => ({
                id: `ziprecruiter-${job.listing_key}`,
                title: job.name ?? 'Unknown Title',
                company: job.hiring_company?.name ?? 'Unknown Company',
                location: formatLocation(job),
                url: `https://www.ziprecruiter.com/jobs//j?lvk=${job.listing_key}`,
                source: 'zip_recruiter',
                description: job.job_description,
                salary: formatSalary(job),
                job_type: job.employment_type?.replace(/_/g, ' '),
                date_posted: job.posted_time ? String(job.posted_time).slice(0, 10) : undefined,
                remote: Boolean(job.remote)
            }));
        } catch (error) {
            console.error('ZipRecruiter scraping failed:', error);
            return [];
        }
    }
}
