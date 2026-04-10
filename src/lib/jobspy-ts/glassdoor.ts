import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';
import { resolveJobSpyCountry } from './country';

export class GlassdoorScraper extends BaseScraper {
    name = 'glassdoor';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const country = resolveJobSpyCountry(options.location, options.country);
        if (!country.glassdoorDomain) return [];
        const baseUrl = `https://${country.glassdoorDomain}`;
        const searchSlug = encodeURIComponent(`${options.searchTerm} ${options.location ?? ''}`.trim().replace(/\s+/g, '-'));

        try {
            const response = await this.fetchWithTimeout(`${baseUrl}/Job/${searchSlug}-jobs-SRCH_KO0,${Math.max(searchSlug.length, 1)}.htm`, {
                headers: { 'user-agent': this.userAgent }
            });
            if (!response.ok) return [];
            const doc = this.parseHtml(await response.text());
            if (!doc) return [];

            const scriptText = Array.from(doc.querySelectorAll('script'))
                .map(script => script.textContent ?? '')
                .find(text => text.includes('jobTitleText') || text.includes('listingId'));
            if (!scriptText) return [];

            const jobMatches = Array.from(scriptText.matchAll(/"listingId"\s*:\s*(\d+)[\s\S]{0,1200}?"jobTitleText"\s*:\s*"([^"]+)"[\s\S]{0,1200}?"employerNameFromSearch"\s*:\s*"([^"]*)"/g));
            return jobMatches.slice(0, options.limit ?? 30).map(match => ({
                id: `glassdoor-${match[1]}`,
                title: match[2].replace(/\\"/g, '"'),
                company: match[3].replace(/\\"/g, '"') || 'Unknown Company',
                location: options.location ?? 'Unknown',
                url: `${baseUrl}/job-listing/j?jl=${match[1]}`,
                source: 'glassdoor'
            }));
        } catch (error) {
            console.error('Glassdoor scraping failed:', error);
            return [];
        }
    }
}
