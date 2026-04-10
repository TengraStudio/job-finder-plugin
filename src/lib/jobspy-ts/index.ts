import { LinkedInScraper } from './linkedin';
import { RemotiveScraper } from './remotive';
import { RemoteOkScraper } from './remoteok';
import type { ScrapingOptions, ScrapedJob } from './base';

export async function scrapeJobs(options: ScrapingOptions): Promise<ScrapedJob[]> {
    const scrapers = [
        new LinkedInScraper(),
        new RemotiveScraper(),
        new RemoteOkScraper(),
    ];

    const results = await Promise.allSettled(
        scrapers.map(scraper => scraper.scrape(options))
    );

    const allJobs: ScrapedJob[] = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            allJobs.push(...result.value);
        }
    });

    return allJobs;
}
