import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

function placeholder(job: any, type: string): string | undefined {
    const placeholders = Array.isArray(job?.placeholders) ? job.placeholders : [];
    return placeholders.find((item: any) => item?.type === type)?.label;
}

export class NaukriScraper extends BaseScraper {
    name = 'naukri';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { searchTerm, location = 'India', limit = 40 } = options;
        const params = new URLSearchParams({
            noOfResults: String(Math.min(limit, 20)),
            urlType: 'search_by_keyword',
            searchType: 'adv',
            keyword: searchTerm,
            pageNo: '1',
            k: searchTerm,
            seoKey: `${searchTerm.toLowerCase().replace(/\s+/g, '-')}-jobs`,
            src: 'jobsearchDesk',
            location
        });
        if (options.remoteOnly) params.set('remote', 'true');

        try {
            const response = await this.fetchWithTimeout(`https://www.naukri.com/jobapi/v3/search?${params.toString()}`, {
                headers: {
                    'accept': 'application/json',
                    'appid': '109',
                    'systemid': 'Naukri',
                    'user-agent': this.userAgent
                }
            });
            if (!response.ok) return [];
            const data = await response.json();
            const jobs = Array.isArray(data?.jobDetails) ? data.jobDetails : [];

            return jobs.slice(0, limit).map((job: any): ScrapedJob => ({
                id: `naukri-${job.jobId}`,
                title: job.title ?? 'Unknown Title',
                company: job.companyName ?? 'Unknown Company',
                location: placeholder(job, 'location') ?? location,
                url: `https://www.naukri.com${job.jdURL ?? `/job/${job.jobId}`}`,
                source: 'naukri',
                description: job.jobDescription,
                salary: placeholder(job, 'salary'),
                job_type: placeholder(job, 'experience'),
                date_posted: job.createdDate ? new Date(job.createdDate).toISOString().slice(0, 10) : undefined,
                remote: options.remoteOnly || [job.title, placeholder(job, 'location'), job.jobDescription].join(' ').toLowerCase().includes('remote'),
                skills: typeof job.tagsAndSkills === 'string' ? job.tagsAndSkills.split(',').map((skill: string) => skill.trim()).filter(Boolean) : undefined
            }));
        } catch (error) {
            console.error('Naukri scraping failed:', error);
            return [];
        }
    }
}
