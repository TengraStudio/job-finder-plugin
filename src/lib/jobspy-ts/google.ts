import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';

function deepFindJobArrays(value: unknown, results: any[] = []): any[] {
    if (Array.isArray(value)) {
        if (
            typeof value[0] === 'string' &&
            typeof value[1] === 'string' &&
            typeof value[2] === 'string' &&
            Array.isArray(value[3])
        ) {
            results.push(value);
        }
        value.forEach(item => deepFindJobArrays(item, results));
    } else if (value && typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach(item => deepFindJobArrays(item, results));
    }
    return results;
}

function extractJsonCandidates(html: string): unknown[] {
    const candidates: unknown[] = [];
    const regex = /520084652":(\[.*?\]\s*])\s*}\s*]\s*]\s*]\s*]\s*]/g;
    for (const match of html.matchAll(regex)) {
        try {
            candidates.push(JSON.parse(match[1]));
        } catch {
            continue;
        }
    }
    return candidates;
}

export class GoogleJobsScraper extends BaseScraper {
    name = 'google';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const query = `${options.searchTerm} jobs${options.location ? ` near ${options.location}` : ''}${options.remoteOnly ? ' remote' : ''}`;
        const params = new URLSearchParams({ q: query, udm: '8' });

        try {
            const response = await this.fetchWithTimeout(`https://www.google.com/search?${params.toString()}`, {
                headers: {
                    'user-agent': this.userAgent,
                    'accept-language': 'en-US,en;q=0.9'
                }
            });
            if (!response.ok) return [];
            const html = await response.text();
            const rawJobs = extractJsonCandidates(html).flatMap(candidate => deepFindJobArrays(candidate));
            const seen = new Set<string>();

            return rawJobs.map((jobInfo: any, index): ScrapedJob | null => {
                const title = jobInfo[0];
                const company = jobInfo[1];
                const location = jobInfo[2];
                const url = jobInfo[3]?.[0]?.[0];
                const description = jobInfo[19];
                const id = `google-${jobInfo[28] ?? `${title}-${company}-${index}`}`;
                if (!title || !company || seen.has(id)) return null;
                seen.add(id);
                return {
                    id,
                    title,
                    company,
                    location: location || options.location || 'Unknown',
                    url: url || `https://www.google.com/search?${params.toString()}`,
                    source: 'google',
                    description,
                    remote: String(description ?? '').toLowerCase().includes('remote')
                };
            }).filter((job): job is ScrapedJob => Boolean(job)).slice(0, options.limit ?? 30);
        } catch (error) {
            console.error('Google Jobs scraping failed:', error);
            return [];
        }
    }
}
