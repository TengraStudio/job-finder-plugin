import { BaytScraper } from './bayt';
import { BdJobsScraper } from './bdjobs';
import { GlassdoorScraper } from './glassdoor';
import { GoogleJobsScraper } from './google';
import { IndeedScraper } from './indeed';
import { LinkedInScraper } from './linkedin';
import { NaukriScraper } from './naukri';
import { RemotiveScraper } from './remotive';
import { RemoteOkScraper } from './remoteok';
import { ZipRecruiterScraper } from './ziprecruiter';
import type { ScrapingOptions, ScrapedJob } from './base';

export async function scrapeJobs(options: ScrapingOptions): Promise<ScrapedJob[]> {
    const scrapers = [
        new IndeedScraper(),
        new LinkedInScraper(),
        new ZipRecruiterScraper(),
        new GlassdoorScraper(),
        new GoogleJobsScraper(),
        new BaytScraper(),
        new NaukriScraper(),
        new BdJobsScraper(),
        new RemotiveScraper(),
        new RemoteOkScraper(),
    ].filter(scraper => !options.sites || options.sites.length === 0 || options.sites.includes(scraper.name));

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
