import {
    BadgeCheck,
    BriefcaseBusiness,
    Building2,
    ExternalLink,
    FileText,
    Filter,
    Globe2,
    Link2,
    MapPin,
    Search,
    Sparkles,
    Target,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface JobScoreBreakdown {
    skills: number;
    experience: number;
    location: number;
    language: number;
}

interface JobResult {
    id: string;
    title: string;
    company: string;
    location: string;
    country: string;
    source: string;
    salaryRange: string;
    employmentType: string;
    url: string;
    score: number;
    postedAgo: string;
    highlights: string[];
    scoreBreakdown: JobScoreBreakdown;
}

interface TengraBridge {
    registerExtensionComponent: (
        viewId: string,
        component: React.ComponentType<Record<string, unknown>>
    ) => void;
}

const COUNTRY_OPTIONS = ['Germany', 'Netherlands', 'United Kingdom', 'Canada', 'United States'];
const SOURCE_OPTIONS = ['LinkedIn', 'Indeed', 'Glassdoor', 'Wellfound', 'RemoteOK'];
const CV_SKILLS = ['TypeScript', 'React', 'Node.js', 'LLM Integration', 'System Design'];

const MOCK_RESULTS: JobResult[] = [
    {
        id: 'job-1',
        title: 'Senior AI Product Engineer',
        company: 'SynthCore Labs',
        location: 'Berlin / Remote EU',
        country: 'Germany',
        source: 'LinkedIn',
        salaryRange: 'EUR 95k - 130k',
        employmentType: 'Full-time',
        url: 'https://example.com/jobs/synthcore-ai-product-engineer',
        score: 94,
        postedAgo: '2h ago',
        highlights: ['Excellent TypeScript fit', 'Strong LLM stack match', 'Remote-friendly team'],
        scoreBreakdown: { skills: 96, experience: 91, location: 95, language: 92 },
    },
    {
        id: 'job-2',
        title: 'Platform Engineer - Developer Tools',
        company: 'NordicScale',
        location: 'Amsterdam Hybrid',
        country: 'Netherlands',
        source: 'Indeed',
        salaryRange: 'EUR 88k - 120k',
        employmentType: 'Full-time',
        url: 'https://example.com/jobs/nordicscale-platform-engineer',
        score: 89,
        postedAgo: '6h ago',
        highlights: ['Great backend alignment', 'Good growth trajectory', 'Hybrid commute required'],
        scoreBreakdown: { skills: 92, experience: 90, location: 80, language: 95 },
    },
    {
        id: 'job-3',
        title: 'AI Solutions Developer',
        company: 'CloudNorth',
        location: 'Toronto On-site',
        country: 'Canada',
        source: 'Glassdoor',
        salaryRange: 'CAD 115k - 145k',
        employmentType: 'Full-time',
        url: 'https://example.com/jobs/cloudnorth-ai-solutions',
        score: 84,
        postedAgo: '1d ago',
        highlights: ['Strong role scope', 'On-site requirement', 'Domain overlap is medium'],
        scoreBreakdown: { skills: 86, experience: 85, location: 76, language: 89 },
    },
];

function toggleOption(options: string[], value: string): string[] {
    return options.includes(value)
        ? options.filter(option => option !== value)
        : [...options, value];
}

function scoreTone(score: number): string {
    if (score >= 90) {
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    }
    if (score >= 80) {
        return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    }
    return 'border-slate-500/40 bg-slate-500/20 text-slate-200';
}

function OptionChips({
    options,
    selected,
    onToggle,
}: {
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
}): JSX.Element {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(option => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onToggle(option)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected.includes(option)
                            ? 'border-primary/40 bg-primary/20 text-primary-foreground'
                            : 'border-border/40 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    }`}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}

export const JobFinderView: React.FC<Record<string, unknown>> = () => {
    const [query, setQuery] = useState('AI Engineer');
    const [cvSummary, setCvSummary] = useState(
        '8+ years in TypeScript/React, strong backend architecture, production LLM tooling, and mentoring experience.'
    );
    const [countries, setCountries] = useState<string[]>(['Germany', 'Netherlands', 'United Kingdom']);
    const [sources, setSources] = useState<string[]>(['LinkedIn', 'Indeed', 'Glassdoor']);
    const [selectedJobId, setSelectedJobId] = useState<string>(MOCK_RESULTS[0].id);
    const [remoteOnly, setRemoteOnly] = useState<boolean>(true);

    const filteredJobs = useMemo(() => {
        return MOCK_RESULTS
            .filter(job => countries.includes(job.country))
            .filter(job => sources.includes(job.source))
            .filter(job => (remoteOnly ? job.location.toLowerCase().includes('remote') : true))
            .filter(job => {
                const loweredQuery = query.trim().toLowerCase();
                if (loweredQuery.length === 0) {
                    return true;
                }
                return (
                    job.title.toLowerCase().includes(loweredQuery)
                    || job.company.toLowerCase().includes(loweredQuery)
                );
            })
            .sort((left, right) => right.score - left.score);
    }, [countries, query, remoteOnly, sources]);

    const selectedJob = filteredJobs.find(job => job.id === selectedJobId) ?? filteredJobs[0] ?? null;
    const averageScore = filteredJobs.length > 0
        ? Math.round(filteredJobs.reduce((total, job) => total + job.score, 0) / filteredJobs.length)
        : 0;

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-slate-950/50 text-foreground">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 p-6">
                <header className="rounded-2xl border border-border/40 bg-card/70 p-5 backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-primary/15 p-2 text-primary"><BriefcaseBusiness className="h-5 w-5" /></div>
                            <div>
                                <h1 className="text-lg font-semibold">Job Finder</h1>
                                <p className="typo-caption text-muted-foreground">CV-aware multi-country sourcing and AI ranking workspace</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Scrapers ready</span>
                            <span className="rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-foreground">AI ranking active</span>
                        </div>
                    </div>
                </header>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <div className="space-y-5 rounded-2xl border border-border/40 bg-card/70 p-5">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                                <input
                                    value={query}
                                    onChange={event => setQuery(event.target.value)}
                                    placeholder="Search role or company"
                                    className="h-10 w-full rounded-lg border border-border/40 bg-background/60 pl-10 pr-3 text-sm focus:border-primary/50 focus:outline-none"
                                />
                            </div>
                            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground">
                                <Filter className="h-3.5 w-3.5" />
                                Smart filters
                            </button>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-border/35 bg-background/40 p-4">
                                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Globe2 className="h-4 w-4" />Target Countries</p>
                                <OptionChips options={COUNTRY_OPTIONS} selected={countries} onToggle={value => setCountries(prev => toggleOption(prev, value))} />
                            </div>
                            <div className="rounded-xl border border-border/35 bg-background/40 p-4">
                                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Link2 className="h-4 w-4" />Sources</p>
                                <OptionChips options={SOURCE_OPTIONS} selected={sources} onToggle={value => setSources(prev => toggleOption(prev, value))} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/35 bg-background/40 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><FileText className="h-4 w-4" />CV Snapshot</p>
                                <button
                                    type="button"
                                    onClick={() => setRemoteOnly(prev => !prev)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${remoteOnly ? 'bg-primary/20 text-primary-foreground' : 'bg-background/60 text-muted-foreground'}`}
                                >
                                    {remoteOnly ? 'Remote only' : 'Hybrid + on-site'}
                                </button>
                            </div>
                            <textarea
                                value={cvSummary}
                                onChange={event => setCvSummary(event.target.value)}
                                className="min-h-24 w-full rounded-lg border border-border/30 bg-background/70 p-3 text-sm leading-relaxed focus:border-primary/50 focus:outline-none"
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                                {CV_SKILLS.map(skill => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200"
                                    >
                                        <BadgeCheck className="h-3.5 w-3.5" />
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-4 rounded-2xl border border-border/40 bg-card/70 p-5">
                        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" />AI Match Summary</p>
                            <p className="mt-2 text-3xl font-semibold">{averageScore}<span className="text-sm text-muted-foreground"> / 100</span></p>
                            <p className="mt-1 text-sm text-muted-foreground">{filteredJobs.length} matching opportunities ranked for your CV.</p>
                        </div>
                        {selectedJob && (
                            <div className="rounded-xl border border-border/35 bg-background/40 p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Target className="h-4 w-4" />Top Recommendation</p>
                                <h3 className="mt-2 text-sm font-semibold">{selectedJob.title}</h3>
                                <p className="text-xs text-muted-foreground">{selectedJob.company} • {selectedJob.location}</p>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-lg border border-border/25 bg-background/60 p-2"><span className="text-muted-foreground">Skills</span><p className="font-semibold">{selectedJob.scoreBreakdown.skills}</p></div>
                                    <div className="rounded-lg border border-border/25 bg-background/60 p-2"><span className="text-muted-foreground">Experience</span><p className="font-semibold">{selectedJob.scoreBreakdown.experience}</p></div>
                                    <div className="rounded-lg border border-border/25 bg-background/60 p-2"><span className="text-muted-foreground">Location</span><p className="font-semibold">{selectedJob.scoreBreakdown.location}</p></div>
                                    <div className="rounded-lg border border-border/25 bg-background/60 p-2"><span className="text-muted-foreground">Language</span><p className="font-semibold">{selectedJob.scoreBreakdown.language}</p></div>
                                </div>
                            </div>
                        )}
                    </aside>
                </section>

                <section className="rounded-2xl border border-border/40 bg-card/70 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold">Ranked Job Listings</h2>
                        <span className="text-xs text-muted-foreground">{filteredJobs.length} results</span>
                    </div>
                    <div className="space-y-3">
                        {filteredJobs.map(job => (
                            <article
                                key={job.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedJobId(job.id)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setSelectedJobId(job.id);
                                    }
                                }}
                                className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedJob?.id === job.id ? 'border-primary/50 bg-primary/10' : 'border-border/30 bg-background/50 hover:border-primary/30'}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">{job.title}</p>
                                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company}</span>
                                            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                                            <span>{job.source} • {job.postedAgo}</span>
                                        </p>
                                    </div>
                                    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(job.score)}`}>{job.score}/100</div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="rounded-md border border-border/30 bg-background/70 px-2 py-1">{job.salaryRange}</span>
                                    <span className="rounded-md border border-border/30 bg-background/70 px-2 py-1">{job.employmentType}</span>
                                    <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20">
                                        Listing <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                                <ul className="mt-3 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
                                    {job.highlights.map(highlight => <li key={`${job.id}-${highlight}`} className="rounded-md bg-background/60 px-2 py-1">{highlight}</li>)}
                                </ul>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

declare global {
    interface Window {
        Tengra?: TengraBridge;
    }
}

if (typeof window !== 'undefined' && window.Tengra?.registerExtensionComponent) {
    window.Tengra.registerExtensionComponent('job-finder.main', JobFinderView);
}
