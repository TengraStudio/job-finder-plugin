import { BaseScraper, type ScrapedJob, type ScrapingOptions } from './base';
import { resolveJobSpyCountry } from './country';

const INDEED_API_KEY = '161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8';

const JOB_SEARCH_QUERY = `
query GetJobData {
  jobSearch(
    {what}
    {location}
    limit: 100
    {cursor}
    sort: RELEVANCE
    {filters}
  ) {
    pageInfo { nextCursor }
    results {
      job {
        key
        title
        datePublished
        description { html }
        location {
          countryName
          countryCode
          admin1Code
          city
          formatted { short long }
        }
        compensation {
          baseSalary { unitOfWork range { ... on Range { min max } } }
          estimated { currencyCode baseSalary { unitOfWork range { ... on Range { min max } } } }
          currencyCode
        }
        attributes { key label }
        employer { name }
        recruit { viewJobUrl }
      }
    }
  }
}
`;

function escapeGraphql(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatLocation(jobLocation: any): string {
    return [
        jobLocation?.city,
        jobLocation?.admin1Code,
        jobLocation?.countryName ?? jobLocation?.countryCode
    ].filter(Boolean).join(', ') || jobLocation?.formatted?.long || jobLocation?.formatted?.short || 'Unknown';
}

function formatSalary(compensation: any): string | undefined {
    const direct = compensation?.baseSalary;
    const estimated = compensation?.estimated?.baseSalary;
    const salary = direct ?? estimated;
    const currency = compensation?.currencyCode ?? compensation?.estimated?.currencyCode;
    const min = salary?.range?.min;
    const max = salary?.range?.max;
    if (min == null && max == null) return undefined;
    return `${currency ? `${currency} ` : ''}${min ?? ''}${min != null && max != null ? ' - ' : ''}${max ?? ''}${salary?.unitOfWork ? ` / ${salary.unitOfWork.toLowerCase()}` : ''}`.trim();
}

function buildFilters(remoteOnly?: boolean): string {
    if (!remoteOnly) return '';
    return `
filters: {
  composite: {
    filters: [{
      keyword: {
        field: "attributes",
        keys: ["DSQF7"]
      }
    }]
  }
}`;
}

export class IndeedScraper extends BaseScraper {
    name = 'indeed';

    async scrape(options: ScrapingOptions): Promise<ScrapedJob[]> {
        const { searchTerm, location = 'USA', limit = 50 } = options;
        const country = resolveJobSpyCountry(location, options.country);
        const baseUrl = `https://${country.indeedDomain}.indeed.com`;
        const query = JOB_SEARCH_QUERY
            .replace('{what}', searchTerm ? `what: "${escapeGraphql(searchTerm)}"` : '')
            .replace('{location}', location ? `location: {where: "${escapeGraphql(location)}", radius: 50, radiusUnit: MILES}` : '')
            .replace('{cursor}', '')
            .replace('{filters}', buildFilters(options.remoteOnly));

        try {
            const response = await this.fetchWithTimeout('https://apis.indeed.com/graphql', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'indeed-api-key': INDEED_API_KEY,
                    'accept': 'application/json',
                    'indeed-locale': 'en-US',
                    'accept-language': 'en-US,en;q=0.9',
                    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1',
                    'indeed-app-info': 'appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone',
                    'indeed-co': country.indeedCountryCode
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) return [];
            const data = await response.json();
            const results = data?.data?.jobSearch?.results;
            if (!Array.isArray(results)) return [];

            return results.slice(0, limit).map((entry: any): ScrapedJob => {
                const job = entry.job;
                const description = stripHtml(job?.description?.html ?? '');
                const attributes = Array.isArray(job?.attributes) ? job.attributes : [];
                return {
                    id: `indeed-${job.key}`,
                    title: job.title ?? 'Unknown Title',
                    company: job.employer?.name ?? 'Unknown Company',
                    location: formatLocation(job.location),
                    url: `${baseUrl}/viewjob?jk=${job.key}`,
                    source: 'indeed',
                    description,
                    salary: formatSalary(job.compensation),
                    job_type: attributes.map((attr: any) => attr?.label).filter(Boolean).join(', ') || undefined,
                    date_posted: job.datePublished ? new Date(job.datePublished).toISOString().slice(0, 10) : undefined,
                    remote: attributes.some((attr: any) => String(attr?.label ?? '').toLowerCase().includes('remote')) || description.toLowerCase().includes('remote')
                };
            });
        } catch (error) {
            console.error('Indeed scraping failed:', error);
            return [];
        }
    }
}
