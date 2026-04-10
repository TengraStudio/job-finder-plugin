import { BadgeCheck, BriefcaseBusiness, FileText, Globe2, Loader2, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface JobFinderMatch {
    score: number;
    reasons: string[];
    fit: string;
}

interface JobFinderJob {
    id: string;
    title: string;
    company: string;
    location: string;
    source: string;
    url: string;
    salaryRange?: string;
    employmentType?: string;
    postedAt?: string;
    skills: string[];
    remote?: boolean;
    match: JobFinderMatch;
}

interface JobFinderPipelineResult {
    cvProfile: {
        summary: string;
        skills: string[];
        preferredLocations: string[];
        preferredCountries: string[];
        remotePreference: string;
        targetRoles: string[];
    };
    jobs: JobFinderJob[];
    rankedJobs: JobFinderJob[];
    aiSummary: string;
    fetchedAt: string;
}

interface TengraBridge {
    registerExtensionComponent: (viewId: string, component: React.ComponentType<Record<string, unknown>>) => void;
}

interface TengraElectron {
    jobFinder: {
        parseCvPdf: (filePath: string) => Promise<{ text: string }>;
        run: (cvText: string) => Promise<JobFinderPipelineResult>;
    };
    selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<{ canceled?: boolean; filePaths?: string[] }>;
    modelRegistry?: {
        getInstalledModels: () => Promise<Array<{ name: string; localPath?: string; path?: string }>>;
    };
    llama?: {
        chat: (messages: Array<{ role: 'system' | 'user'; content: string }>, modelPath: string) => Promise<{ content: string; done: boolean }>;
    };
}

declare global {
    interface Window {
        Tengra?: TengraBridge;
        electron?: TengraElectron;
    }
}

export const JobFinderView: React.FC<Record<string, unknown>> = () => {
    const [cvText, setCvText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<JobFinderPipelineResult | null>(null);

    const topJob = result?.rankedJobs[0] ?? null;
    const averageScore = useMemo(() => {
        if (!result || result.rankedJobs.length === 0) {
            return 0;
        }
        return Math.round(result.rankedJobs.reduce((sum, job) => sum + job.match.score, 0) / result.rankedJobs.length);
    }, [result]);

    const loadPdf = async (): Promise<void> => {
        setError(null);
        const selected = await window.electron?.selectFile({ title: 'Select CV PDF', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
        const filePath = selected?.filePaths?.[0];
        if (!filePath) {
            return;
        }
        const parsed = await window.electron?.jobFinder.parseCvPdf(filePath);
        if (parsed?.text) {
            setCvText(parsed.text);
        }
    };

    const runAnalysis = async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const pipeline = await window.electron?.jobFinder.run(cvText);
            if (!pipeline) {
                throw new Error('Job pipeline is unavailable.');
            }
            const installedModels = await window.electron?.modelRegistry?.getInstalledModels();
            const modelPath = installedModels?.find(model => typeof model.localPath === 'string' || typeof model.path === 'string')?.localPath ?? installedModels?.find(model => typeof model.path === 'string')?.path;
            if (modelPath && window.electron?.llama) {
                const response = await window.electron.llama.chat([
                    { role: 'system', content: 'Summarize the best job matches using only the provided ranked list. Do not invent jobs.' },
                    { role: 'user', content: JSON.stringify({ cvProfile: pipeline.cvProfile, topJobs: pipeline.rankedJobs.slice(0, 5) }) },
                ], modelPath);
                pipeline.aiSummary = response.content || pipeline.aiSummary;
            }
            setResult(pipeline);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-background text-foreground">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 p-6">
                <header className="rounded-2xl border border-border/40 bg-card/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-primary/15 p-2 text-primary"><BriefcaseBusiness className="h-5 w-5" /></div>
                            <div>
                                <h1 className="text-lg font-semibold">Job Finder</h1>
                                <p className="text-sm text-muted-foreground">CV parse + live job fetch + ranked shortlist</p>
                            </div>
                        </div>
                        <button type="button" onClick={runAnalysis} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Analyze jobs
                        </button>
                    </div>
                </header>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <div className="space-y-4 rounded-2xl border border-border/40 bg-card/80 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" /> CV input</div>
                            <button type="button" onClick={loadPdf} className="rounded-lg border border-border/40 px-3 py-1.5 text-sm">Load PDF</button>
                        </div>
                        <textarea value={cvText} onChange={event => setCvText(event.target.value)} placeholder="Paste CV text or load a PDF..." className="min-h-56 w-full rounded-xl border border-border/40 bg-background p-3 text-sm" />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {['Parse PDF', 'Normalize CV', 'Fetch live jobs', 'Rank results'].map(step => (
                                <span key={step} className="rounded-full border border-border/40 px-3 py-1">{step}</span>
                            ))}
                        </div>
                        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                    </div>

                    <aside className="space-y-4 rounded-2xl border border-border/40 bg-card/80 p-5">
                        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Globe2 className="h-4 w-4" />Live analysis</p>
                            <p className="mt-2 text-3xl font-semibold">{averageScore}<span className="text-sm text-muted-foreground"> / 100</span></p>
                            <p className="mt-1 text-sm text-muted-foreground">{result?.rankedJobs.length ?? 0} jobs ranked from live sources.</p>
                        </div>
                        {topJob && (
                            <div className="rounded-xl border border-border/35 bg-background/40 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top recommendation</p>
                                <h3 className="mt-2 text-sm font-semibold">{topJob.title}</h3>
                                <p className="text-xs text-muted-foreground">{topJob.company} • {topJob.location}</p>
                                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                    {topJob.match.reasons.map(reason => <div key={reason} className="rounded-lg border border-border/30 bg-background/70 px-2 py-1">{reason}</div>)}
                                </div>
                            </div>
                        )}
                        {result && <p className="text-sm text-muted-foreground">{result.aiSummary}</p>}
                    </aside>
                </section>

                <section className="rounded-2xl border border-border/40 bg-card/80 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold">Ranked jobs</h2>
                        <span className="text-xs text-muted-foreground">{result?.rankedJobs.length ?? 0} results</span>
                    </div>
                    <div className="space-y-3">
                        {(result?.rankedJobs ?? []).map(job => (
                            <article key={job.id} className="rounded-xl border border-border/30 bg-background/50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold">{job.title}</p>
                                        <p className="text-xs text-muted-foreground">{job.company} • {job.location} • {job.source}</p>
                                    </div>
                                    <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold">{job.match.score}/100</div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {job.skills.map(skill => <span key={skill} className="rounded-full border border-border/30 px-2 py-1">{skill}</span>)}
                                    {job.salaryRange && <span className="rounded-full border border-border/30 px-2 py-1">{job.salaryRange}</span>}
                                    {job.employmentType && <span className="rounded-full border border-border/30 px-2 py-1">{job.employmentType}</span>}
                                </div>
                                <a href={job.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary">Open listing</a>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

if (typeof window !== 'undefined' && window.Tengra?.registerExtensionComponent) {
    window.Tengra.registerExtensionComponent('job-finder.main', JobFinderView);
}
