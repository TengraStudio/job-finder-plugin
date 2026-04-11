import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Check,
    CheckCircle2,
    ChevronDown,
    ExternalLink,
    FileText,
    FileSearch,
    Gauge,
    Layers,
    Loader2,
    Search,
    ShieldCheck,
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
type StepId = 'cv' | 'search' | 'results';
type ButtonVariant = 'default' | 'outline' | 'ghost';

interface Option<TValue extends string> {
    value: TValue;
    label: string;
}

interface ModelSelectorProps {
    models: AvailableModel[];
    selectedModel: SelectedModel | null;
    onSelect: (model: SelectedModel) => void;
}

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

const remoteOptions: Array<Option<RemotePreference>> = [
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

const steps: Array<{ id: StepId; title: string; description: string }> = [
    { id: 'cv', title: 'CV source', description: 'Upload or create' },
    { id: 'search', title: 'Model and search', description: 'Choose runtime' },
    { id: 'results', title: 'Matches', description: 'Ranked roles' }
];

const intakeHighlights = [
    { icon: FileText, label: 'CV intake', value: 'PDF or builder' },
    { icon: ShieldCheck, label: 'Parsing', value: 'Local bridge' },
    { icon: Layers, label: 'Next step', value: 'Model + sources' }
];

function cn(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(' ');
}

function modelId(model: AvailableModel): string {
    return model.id || model.name || model.path || model.localPath || '';
}

function modelLabel(model: AvailableModel): string {
    return model.name || modelId(model);
}

function selectedModelValue(model: SelectedModel | null): string {
    return model ? `${model.provider}::${model.model}` : '';
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
    const { className, variant = 'default', ...buttonProps } = props;
    return (
        <button
            {...buttonProps}
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
                variant === 'default' && 'bg-primary text-primary-foreground hover:opacity-90',
                variant === 'outline' && 'border border-border bg-background hover:bg-muted',
                variant === 'ghost' && 'hover:bg-muted',
                className
            )}
        />
    );
}

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <section {...props} className={cn('rounded-md border border-border bg-card p-5 text-card-foreground shadow-sm', className)} />;
}

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
    return <span {...props} className={cn('inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground', className)} />;
}

function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return <label {...props} className={cn('text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)} />;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn('min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20', props.className)} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20', props.className)} />;
}

function Select<TValue extends string>(props: { id: string; value: TValue; options: Array<Option<TValue>>; onChange: (value: TValue) => void }) {
    return (
        <select
            id={props.id}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={props.value}
            onChange={event => props.onChange(event.target.value as TValue)}
        >
            {props.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
    );
}

function Stepper({ activeStep }: { activeStep: StepId }) {
    const activeIndex = steps.findIndex(step => step.id === activeStep);
    return (
        <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
                <div key={step.id} className={cn('rounded-md border p-3 transition', index <= activeIndex ? 'border-primary bg-primary/10' : 'border-border bg-background')}>
                    <div className="flex items-center gap-3">
                        <span className={cn('flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold', index <= activeIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                            {index < activeIndex ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <div>
                            <p className="text-sm font-semibold">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CvIntakePanel({ cvMode, pdfPath }: { cvMode: CvMode; pdfPath: string | null }) {
    return (
        <aside className="grid gap-4 rounded-md border border-border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <FileSearch className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-base font-semibold">Candidate intake</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Bring an existing CV or generate a structured one before model analysis.</p>
                </div>
            </div>
            <div className="grid gap-2">
                {intakeHighlights.map(item => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                            <span className="inline-flex items-center gap-2 text-sm font-medium">
                                <Icon className="h-4 w-4 text-primary" />
                                {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{item.value}</span>
                        </div>
                    );
                })}
            </div>
            <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Current mode</span>
                    <Badge>{cvMode === 'pdf' ? 'Existing PDF' : 'Create CV'}</Badge>
                </div>
                <p className="break-all text-xs text-muted-foreground">{pdfPath ?? 'No CV selected yet.'}</p>
            </div>
        </aside>
    );
}

async function readPdfText(filePath: string): Promise<string> {
    const result = await window.electron?.readPdf?.(filePath);
    if (!result) {
        throw new Error('Tengra PDF reader bridge is not available.');
    }
    if (!result.success || !result.text?.trim()) {
        throw new Error(result.error ?? 'The selected PDF did not return readable text.');
    }
    return result.text;
}

function TengraModelSelector({ models, selectedModel, onSelect }: ModelSelectorProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selectedValue = selectedModelValue(selectedModel);

    const filteredModels = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return models.filter(model => {
            const haystack = `${model.provider} ${modelLabel(model)} ${model.id}`.toLowerCase();
            return normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
        }).slice(0, 80);
    }, [models, query]);

    const providerCounts = useMemo(() => {
        const counts = new Map<string, number>();
        models.forEach(model => counts.set(model.provider, (counts.get(model.provider) ?? 0) + 1));
        return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [models]);

    return (
        <div className="relative">
            <Button type="button" variant="outline" className="w-full justify-between px-3" onClick={() => setOpen(prev => !prev)} aria-expanded={open}>
                <span className="truncate text-left">{selectedModel ? `${selectedModel.provider} / ${selectedModel.model}` : 'Select a Tengra model'}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
            {open && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-xl">
                    <div className="border-b border-border p-3">
                        <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search all Tengra providers" autoFocus />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {providerCounts.map(([provider, count]) => (
                                <span key={provider} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{provider} {count}</span>
                            ))}
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-1">
                        {filteredModels.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground">No model found.</p>
                        ) : filteredModels.map(model => {
                            const id = modelId(model);
                            const value = `${model.provider}::${id}`;
                            return (
                                <button
                                    type="button"
                                    key={value}
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                        onSelect({ provider: model.provider, model: id });
                                        setOpen(false);
                                    }}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">{modelLabel(model)}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{model.provider}</span>
                                    </span>
                                    {selectedValue === value && <Check className="h-4 w-4 text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export const JobFinderView: React.FC<Record<string, unknown>> = () => {
    const [activeStep, setActiveStep] = useState<StepId>('cv');
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
                setSelectedModel({ provider: first.provider, model: modelId(first) });
            }
        });
    }, []);

    const averageScore = useMemo(() => {
        if (!result?.rankedJobs.length) return 0;
        return Math.round(result.rankedJobs.reduce((sum, job) => sum + job.match.score, 0) / result.rankedJobs.length);
    }, [result]);

    const draftText = buildCvTextFromDraft(cvDraft);
    const cvReady = cvText.trim().length > 0 || draftText.trim().length > 0;
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
            const parsed = await readPdfText(filePath);
            setCvText(parsed);
            setPdfPath(filePath);
            setCvMode('pdf');
            setStatus('PDF loaded');
            setActiveStep('search');
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
            setActiveStep('search');
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
            setActiveStep('results');
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
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                            <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Job Finder</h1>
                            <p className="text-sm text-muted-foreground">Prepare a CV, select any Tengra model, then search ranked roles.</p>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                        <Gauge className="h-4 w-4 text-primary" />
                        {status}
                    </div>
                </header>

                <Stepper activeStep={activeStep} />
                {error && <Card className="border-destructive/40 bg-destructive/10 text-destructive"><p className="text-sm font-medium">{error}</p></Card>}

                {activeStep === 'cv' && (
                    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                        <CvIntakePanel cvMode={cvMode} pdfPath={pdfPath} />
                        <Card className="grid gap-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-primary">Step 1</p>
                                    <h2 className="mt-1 text-2xl font-semibold">Start with a CV</h2>
                                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Select an existing PDF. If you do not have one ready, build a clean PDF here from structured inputs.</p>
                                </div>
                                {pdfPath && <Badge className="max-w-full gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Ready</Badge>}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button type="button" variant={cvMode === 'pdf' ? 'default' : 'outline'} onClick={() => setCvMode('pdf')}><Upload className="h-4 w-4" /> Existing PDF</Button>
                                <Button type="button" variant={cvMode === 'builder' ? 'default' : 'outline'} onClick={() => setCvMode('builder')}><FileText className="h-4 w-4" /> Create CV</Button>
                            </div>
                            {cvMode === 'pdf' ? (
                                <div className="grid gap-4">
                                    <Button type="button" variant="outline" onClick={loadPdf} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Load PDF</Button>
                                    <Textarea value={cvText} onChange={event => setCvText(event.target.value)} placeholder="PDF text will appear here. You can also paste CV text for testing." className="min-h-56 resize-y" />
                                    <Button type="button" disabled={!cvText.trim()} onClick={() => setActiveStep('search')}>Continue with this CV <ArrowRight className="h-4 w-4" /></Button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Input placeholder="Full name" value={cvDraft.fullName} onChange={event => updateDraft('fullName', event.target.value)} />
                                        <Input placeholder="Headline" value={cvDraft.headline} onChange={event => updateDraft('headline', event.target.value)} />
                                        <Input placeholder="Email" value={cvDraft.email} onChange={event => updateDraft('email', event.target.value)} />
                                        <Input placeholder="Phone" value={cvDraft.phone} onChange={event => updateDraft('phone', event.target.value)} />
                                        <Input className="md:col-span-2" placeholder="Location" value={cvDraft.location} onChange={event => updateDraft('location', event.target.value)} />
                                    </div>
                                    <Textarea className="min-h-24" placeholder="Professional summary" value={cvDraft.summary} onChange={event => updateDraft('summary', event.target.value)} />
                                    <Textarea className="min-h-24" placeholder="Skills, comma separated" value={cvDraft.skills} onChange={event => updateDraft('skills', event.target.value)} />
                                    <Textarea className="min-h-32" placeholder="Experience" value={cvDraft.experience} onChange={event => updateDraft('experience', event.target.value)} />
                                    <Textarea className="min-h-24" placeholder="Education" value={cvDraft.education} onChange={event => updateDraft('education', event.target.value)} />
                                    <Input placeholder="Links" value={cvDraft.links} onChange={event => updateDraft('links', event.target.value)} />
                                    <Button type="button" onClick={buildPdfFromInputs} disabled={loading || !draftText.trim()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Create CV PDF and continue</Button>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeStep === 'search' && (
                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                        <Card className="grid gap-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h2 className="text-xl font-semibold">Tengra model selector</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">This adapter reads Tengra's full model catalog, including proxy-backed providers, not only local Ollama or Hugging Face entries.</p>
                            <TengraModelSelector models={models} selectedModel={selectedModel} onSelect={setSelectedModel} />
                            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                                {models.length} models available across {new Set(models.map(model => model.provider)).size} providers.
                            </div>
                        </Card>

                        <Card className="grid gap-4">
                            <h2 className="text-xl font-semibold">Search preferences</h2>
                            <div>
                                <FieldLabel htmlFor="countries">Countries</FieldLabel>
                                <Input id="countries" value={countriesInput} onChange={event => setCountriesInput(event.target.value)} placeholder="Germany, Netherlands, United Kingdom" />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <FieldLabel htmlFor="target-role">Target role</FieldLabel>
                                    <Input id="target-role" value={targetRole} onChange={event => setTargetRole(event.target.value)} placeholder="Role to search for" />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="remote">Work mode</FieldLabel>
                                    <Select id="remote" value={remotePreference} options={remoteOptions} onChange={setRemotePreference} />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="limit">Limit per country</FieldLabel>
                                    <Input id="limit" type="number" min={5} max={100} value={limitPerCountry} onChange={event => setLimitPerCountry(Number(event.target.value) || 25)} />
                                </div>
                            </div>
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <FieldLabel>Sources</FieldLabel>
                                    <Button type="button" variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={() => setSelectedSites(siteOptions.map(site => site.id))}>Select all</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {siteOptions.map(site => (
                                        <Button
                                            type="button"
                                            key={site.id}
                                            variant={selectedSites.includes(site.id) ? 'default' : 'outline'}
                                            className="min-h-9 px-3 py-1.5 text-xs"
                                            onClick={() => toggleSite(site.id)}
                                        >
                                            {site.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                                <Button type="button" variant="outline" onClick={() => setActiveStep('cv')}><ArrowLeft className="h-4 w-4" /> Back</Button>
                                <Button type="button" disabled={loading || !cvReady || !selectedModel?.model} onClick={runPipeline}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    Run search
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {activeStep === 'results' && (
                    <Card className="grid gap-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-primary">Step 3</p>
                                <h2 className="mt-1 text-2xl font-semibold">Profile and ranked matches</h2>
                                <p className="mt-2 text-sm text-muted-foreground">{result?.aiSummary ?? status}</p>
                            </div>
                            <div className="rounded-md border border-border px-4 py-3 text-sm"><span className="text-lg font-semibold">{averageScore}</span> / 100 avg</div>
                        </div>

                        {profile && (
                            <div className="grid gap-3 rounded-md bg-muted p-4">
                                <p className="text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
                                <div className="flex flex-wrap gap-2">
                                    {topSkills.map(skill => <span key={skill} className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted-foreground">{skill}</span>)}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-3">
                            {result?.rankedJobs.slice(0, 30).map(job => (
                                <article key={job.id} className="rounded-md border border-border p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-semibold">{job.title}</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">{job.company} · {job.location}</p>
                                        </div>
                                        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{job.match.score}% match</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {job.match.reasons.slice(0, 4).map(reason => <span key={reason} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{reason}</span>)}
                                    </div>
                                    <a href={job.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                                        Open listing <ExternalLink className="h-4 w-4" />
                                    </a>
                                </article>
                            ))}
                        </div>

                        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveStep('search')}><ArrowLeft className="h-4 w-4" /> Refine search</Button>
                            <Button type="button" onClick={runPipeline} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                Search again
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

if (typeof window !== 'undefined' && window.Tengra?.registerExtensionComponent) {
    window.Tengra.registerExtensionComponent('job-finder.main', JobFinderView);
}
