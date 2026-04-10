import { scrapeJobs } from '../lib/jobspy-ts';
import type { CvProfile, Job, SearchPreferences, SelectedModel } from '../types';
import { scoreJob } from '../utils/jobRanker';
import { summarizeMatchesWithAi } from './tengraAiClient';

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function extractSkills(description: string | undefined, profile: CvProfile): string[] {
    const text = (description ?? '').toLowerCase();
    const profileMatches = profile.skills.filter(skill => text.includes(skill.toLowerCase()));
    return unique(profileMatches).slice(0, 12);
}

function isRemote(title: string, location: string, description?: string): boolean {
    const text = `${title} ${location} ${description ?? ''}`.toLowerCase();
    return text.includes('remote') || text.includes('anywhere') || text.includes('work from home');
}

export async function searchAndRankJobs(
    profile: CvProfile,
    preferences: SearchPreferences,
    selectedModel: SelectedModel | null
): Promise<{ jobs: Job[]; rankedJobs: Job[]; aiSummary: string }> {
    const countries = preferences.countries.length > 0 ? preferences.countries : ['Worldwide'];
    const searchTerm = preferences.targetRole || profile.targetRoles[0] || profile.skills[0] || '';
    if (!searchTerm) {
        throw new Error('Enter a target role or make sure the selected model can extract one from the CV.');
    }

    const batches = await Promise.allSettled(
        countries.map(country => scrapeJobs({
            searchTerm,
            location: country,
            limit: preferences.limitPerCountry,
            remoteOnly: preferences.remotePreference === 'remote',
            country,
            sites: preferences.sites
        }))
    );

    const scraped = batches.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    const seen = new Set<string>();
    const jobs: Job[] = [];

    scraped.forEach(item => {
        const key = `${item.source}:${item.url || item.title}:${item.company}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        jobs.push({
            id: item.id,
            title: item.title,
            company: item.company,
            location: item.location,
            country: countries.find(country => item.location.toLowerCase().includes(country.toLowerCase())),
            source: item.source,
            url: item.url,
            description: item.description,
            salaryRange: item.salary,
            employmentType: item.job_type,
            postedAt: item.date_posted,
            remote: isRemote(item.title, item.location, item.description),
            skills: item.skills?.length ? item.skills : extractSkills(item.description, profile),
            match: { score: 0, reasons: [], fit: 'blocked' }
        });
    });

    const rankedJobs = jobs
        .map(job => ({
            ...job,
            match: scoreJob({
                ...profile,
                preferredCountries: unique([...profile.preferredCountries, ...countries]),
                remotePreference: preferences.remotePreference
            }, job)
        }))
        .sort((a, b) => b.match.score - a.match.score);

    const summaryInput = rankedJobs.map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        score: job.match.score
    }));

    const aiSummary = selectedModel?.model
        ? await summarizeMatchesWithAi(profile, summaryInput, selectedModel).catch(() => null)
        : null;

    return {
        jobs,
        rankedJobs,
        aiSummary: aiSummary ?? (rankedJobs[0]
            ? `Top match: ${rankedJobs[0].title} at ${rankedJobs[0].company}.`
            : 'No jobs found for the current profile and country selection.')
    };
}
