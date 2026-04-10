import {
    BriefcaseBusiness,
    CheckCircle2,
    ExternalLink,
    FileText,
    Loader2,
    Search,
    Sparkles,
    Upload
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import type {
    AvailableModel,
    CvDraft,
    CvProfile,
    JobFinderPipelineResult,
    RemotePreference,
    SearchPreferences,
    SelectedModel
} from '../types';
import {
    buildCvTextFromDraft,
    createProfile,
    exportDraftToPdf,
    mergeSearchCountries
} from '../services/cvService';
import { searchAndRankJobs } from '../services/jobService';
import { listTengraModels } from '../services/tengraAiClient';

type CvMode = 'pdf' | 'builder';

const emptyDraft: CvDraft = {
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    skills: '',
    experience: '',
    education: '',
    links: ''
};

const remoteOptions: Array<{ value: RemotePreference; label: string }> = [
    { value: 'any', label: 'Any' },
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'on-site', label: 'On-site' }
];

const siteOptions = [
    { id: 'indeed', label: 'Indeed' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'zip_recruiter', label: 'ZipRecruiter' },
    { id: 'glassdoor', label: 'Glassdoor' },
    { id: 'google', label: 'Google Jobs' },
    { id: 'bayt', label: 'Bayt' },
    { id: 'naukri', label: 'Naukri' },
    { id: 'bdjobs', label: 'BDJobs' },
    { id: 'remotive', label: 'Remotive' },
    { id: 'remoteok', label: 'RemoteOK' }
];

function fieldClass(): string {
    return 'w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary';
}

function labelClass(): string {
    return 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
}

export const JobFinderView: React.FC<Record<string, unknown>> = () => {
    const [models, setModels] = useState<AvailableModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
    const [cvMode, setCvMode] = useState<CvMode>('pdf');
    const [cvText, setCvText] = useState('');
    const [cvDraft, setCvDraft] = useState<CvDraft>(emptyDraft);
    const [profile, setProfile] = useState<CvProfile | null>(null);
    const [countriesInput, setCountriesInput] = useState('Germany, Netherlands, United Kingdom');
    const [targetRole, setTargetRole] = useState('');
    const [remotePreference, setRemotePreference] = useState<RemotePreference>('any');
    const [limitPerCountry, setLimitPerCountry] = useState(25);
    const [selectedSites, setSelectedSites] = useState<string[]>(() => siteOptions.map(site => site.id));
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [error, setError] = useState<string | null>(null);
    const [pdfPath, setPdfPath] = useState<string | null>(null);
    const [result, setResult] = useState<JobFinderPipelineResult | null>(null);

    useEffect(() => {
        void listTengraModels().then(items => {
            setModels(items);
            const first = items[0];
            if (first) {
                setSelectedModel({
                    provider: first.provider || 'ollama',
                    model: first.id || first.name || first.path || first.localPath || ''
                });
            }
        });
    }, []);

    const modelValue = selectedModel ? `${selectedModel.provider}::${selectedModel.model}` : '';

    const averageScore = useMemo(() => {
        if (!result?.rankedJobs.length) return 0;
        return Math.round(result.rankedJobs.reduce((sum, job) => sum + job.match.score, 0) / result.rankedJobs.length);
    }, [result]);

    const topSkills = profile?.skills.slice(0, 12) ?? [];

    const updateDraft = (key: keyof CvDraft, value: string) => {
        setCvDraft(prev => ({ ...prev, [key]: value }));
    };

    const toggleSite = (siteId: string) => {
        setSelectedSites(prev => {
            if (prev.includes(siteId)) {
                const next = prev.filter(id => id !== siteId);
                return next.length === 0 ? prev : next;
            }
            return [...prev, siteId];
        });
    };

    const loadPdf = async () => {
        setError(null);
        const filePath = await window.electron?.files?.selectFile?.({
            title: 'Select CV PDF',
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (!filePath) return;

        setLoading(true);
        setStatus('Reading PDF');
        try {
            const parsed = await window.electron?.files?.readPdf?.(filePath);
            if (!parsed?.trim()) throw new Error('The selected PDF did not return readable text.');
            setCvText(parsed);
            setPdfPath(filePath);
            setCvMode('pdf');
            setStatus('PDF loaded');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to read PDF.');
        } finally {
            setLoading(false);
        }
    };

    const buildPdfFromInputs = async () => {
        setError(null);
        setLoading(true);
        setStatus('Creating CV PDF');
        try {
            const text = buildCvTextFromDraft(cvDraft);
            if (!text.trim()) throw new Error('Fill in the CV builder fields first.');
            const path = await exportDraftToPdf(cvDraft);
            setCvText(text);
            setPdfPath(path);
            setCvMode('builder');
            setStatus('CV PDF created');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create CV PDF.');
        } finally {
            setLoading(false);
        }
    };

    const analyzeProfile = async (): Promise<CvProfile> => {
        const text = cvMode === 'builder' ? buildCvTextFromDraft(cvDraft) : cvText;
        if (!text.trim()) throw new Error('Load a CV PDF or create one from the form first.');
        if (!selectedModel?.model) throw new Error('Select a Tengra model before analyzing the CV.');
        setStatus('Analyzing CV with selected model');
        const nextProfile = await createProfile(text, selectedModel);
        setProfile(nextProfile);
        if (!targetRole && nextProfile.targetRoles[0]) setTargetRole(nextProfile.targetRoles[0]);
        if (countriesInput.trim() === '' && nextProfile.preferredCountries.length > 0) {
            setCountriesInput(nextProfile.preferredCountries.join(', '));
        }
        if (remotePreference === 'any' && nextProfile.remotePreference !== 'any') {
            setRemotePreference(nextProfile.remotePreference);
        }
        return nextProfile;
    };

    const runPipeline = async () => {
        setError(null);
        setLoading(true);
        setResult(null);

        try {
            const nextProfile = await analyzeProfile();
            const preferences: SearchPreferences = {
                countries: mergeSearchCountries(countriesInput, nextProfile),
                targetRole: targetRole || nextProfile.targetRoles[0] || '',
                remotePreference,
                limitPerCountry,
                sites: selectedSites
            };

            setStatus(`Searching jobs in ${preferences.countries.join(', ') || 'Worldwide'}`);
            const jobResult = await searchAndRankJobs(nextProfile, preferences, selectedModel);
            setResult({
                cvProfile: nextProfile,
                jobs: jobResult.jobs,
                rankedJobs: jobResult.rankedJobs,
                aiSummary: jobResult.aiSummary,
                fetchedAt: new Date().toISOString()
            });
            setStatus('Done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Job Finder failed.');
            setStatus('Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-background text-foreground">
            <div className="mx-auto flex max-w-6xl flex-col gap-5 p-5">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Job Finder</h1>
                            <p className="text-sm text-muted-foreground">CV PDF, AI profile extraction, country-based job search.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={runPipeline}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Run search
                    </button>
                </header>

                <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold">1. Model</h2>
                        </div>
                        <label className={labelClass()} htmlFor="model">Tengra model</label>
                        <select
                            id="model"
                            className={fieldClass()}
                            value={modelValue}
                            onChange={event => {
                                const [provider, model] = event.target.value.split('::');
                                setSelectedModel({ provider: provider || 'ollama', model: model || '' });
                            }}
                        >
                            {models.length === 0 ? (
                                <option value="">No model found</option>
                            ) : models.map(model => {
                                const id = model.id || model.name || model.path || model.localPath || '';
                                const provider = model.provider || 'ollama';
                                return (
                                    <option key={`${provider}-${id}`} value={`${provider}::${id}`}>
                                        {provider} / {model.name || id}
                                    </option>
                                );
                            })}
                        </select>

                        <div className="mt-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h2 className="font-semibold">2. CV PDF</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setCvMode('pdf')}
                                className={`rounded-lg border px-3 py-2 text-sm ${cvMode === 'pdf' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                            >
                                Existing PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => setCvMode('builder')}
                                className={`rounded-lg border px-3 py-2 text-sm ${cvMode === 'builder' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                            >
                                Create CV
                            </button>
                        </div>

                        {cvMode === 'pdf' ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={loadPdf}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                                >
                                    <Upload className="h-4 w-4" />
                                    Load PDF
                                </button>
                                <textarea
                                    value={cvText}
                                    onChange={event => setCvText(event.target.value)}
                                    placeholder="PDF text will appear here. You can also paste CV text for testing."
                                    className={`${fieldClass()} min-h-44 resize-y`}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <input className={fieldClass()} placeholder="Full name" value={cvDraft.fullName} onChange={event => updateDraft('fullName', event.target.value)} />
                                <input className={fieldClass()} placeholder="Headline" value={cvDraft.headline} onChange={event => updateDraft('headline', event.target.value)} />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <input className={fieldClass()} placeholder="Email" value={cvDraft.email} onChange={event => updateDraft('email', event.target.value)} />
                                    <input className={fieldClass()} placeholder="Phone" value={cvDraft.phone} onChange={event => updateDraft('phone', event.target.value)} />
                                </div>
                                <input className={fieldClass()} placeholder="Location" value={cvDraft.location} onChange={event => updateDraft('location', event.target.value)} />
                                <textarea className={`${fieldClass()} min-h-20`} placeholder="Professional summary" value={cvDraft.summary} onChange={event => updateDraft('summary', event.target.value)} />
                                <textarea className={`${fieldClass()} min-h-20`} placeholder="Skills, comma separated" value={cvDraft.skills} onChange={event => updateDraft('skills', event.target.value)} />
                                <textarea className={`${fieldClass()} min-h-28`} placeholder="Experience" value={cvDraft.experience} onChange={event => updateDraft('experience', event.target.value)} />
                                <textarea className={`${fieldClass()} min-h-20`} placeholder="Education" value={cvDraft.education} onChange={event => updateDraft('education', event.target.value)} />
                                <input className={fieldClass()} placeholder="Links" value={cvDraft.links} onChange={event => updateDraft('links', event.target.value)} />
                                <button type="button" onClick={buildPdfFromInputs} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                                    Create CV PDF
                                </button>
                            </div>
                        )}

                        {pdfPath && (
                            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                {pdfPath}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <section className="rounded-lg border border-border p-4">
                            <h2 className="mb-4 font-semibold">3. Search preferences</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className={labelClass()} htmlFor="countries">Countries</label>
                                    <input
                                        id="countries"
                                        className={fieldClass()}
                                        value={countriesInput}
                                        onChange={event => setCountriesInput(event.target.value)}
                                        placeholder="Germany, Netherlands, United Kingdom"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass()} htmlFor="target-role">Target role</label>
                                    <input
                                        id="target-role"
                                        className={fieldClass()}
                                        value={targetRole}
                                        onChange={event => setTargetRole(event.target.value)}
                                        placeholder="Role to search for"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass()} htmlFor="remote">Work mode</label>
                                    <select id="remote" className={fieldClass()} value={remotePreference} onChange={event => setRemotePreference(event.target.value as RemotePreference)}>
                                        {remoteOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass()} htmlFor="limit">Limit per country</label>
                                    <input
                                        id="limit"
                                        className={fieldClass()}
                                        type="number"
                                        min={5}
                                        max={100}
                                        value={limitPerCountry}
                                        onChange={event => setLimitPerCountry(Number(event.target.value) || 25)}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label className={labelClass()}>Sources</label>
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-primary"
                                            onClick={() => setSelectedSites(siteOptions.map(site => site.id))}
                                        >
                                            Select all
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {siteOptions.map(site => (
                                            <button
                                                type="button"
                                                key={site.id}
                                                onClick={() => toggleSite(site.id)}
                                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${selectedSites.includes(site.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                                            >
                                                {site.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-lg border border-border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold">4. Profile and results</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">{status}</p>
                                </div>
                                <div className="rounded-lg border border-border px-3 py-2 text-sm">
                                    <span className="font-semibold">{averageScore}</span> / 100 avg
                                </div>
                            </div>

                            {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}

                            {profile && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {topSkills.map(skill => (
                                            <span key={skill} className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result && (
                                <div className="mt-5">
                                    <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{result.aiSummary}</p>
                                    <div className="grid gap-3">
                                        {result.rankedJobs.slice(0, 30).map(job => (
                                            <article key={job.id} className="rounded-lg border border-border p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="font-semibold">{job.title}</h3>
                                                        <p className="mt-1 text-sm text-muted-foreground">{job.company} · {job.location}</p>
                                                    </div>
                                                    <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                        {job.match.score}% match
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {job.match.reasons.slice(0, 4).map(reason => (
                                                        <span key={reason} className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">{reason}</span>
                                                    ))}
                                                </div>
                                                <a
                                                    href={job.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                                                >
                                                    Open listing <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </section>
            </div>
        </div>
    );
};

if (typeof window !== 'undefined' && window.Tengra?.registerExtensionComponent) {
    window.Tengra.registerExtensionComponent('job-finder.main', JobFinderView);
}
