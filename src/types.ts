import type React from 'react';

export type RemotePreference = 'remote' | 'on-site' | 'hybrid' | 'any';

export interface JobMatch {
    score: number;
    reasons: string[];
    fit: 'recommended' | 'workable' | 'limited' | 'blocked';
}

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    country?: string;
    source: string;
    url: string;
    description?: string;
    salaryRange?: string;
    employmentType?: string;
    postedAt?: string;
    skills: string[];
    remote?: boolean;
    match: JobMatch;
}

export interface CvDraft {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
    links: string;
}

export interface CvProfile {
    summary: string;
    skills: string[];
    preferredLocations: string[];
    preferredCountries: string[];
    remotePreference: RemotePreference;
    targetRoles: string[];
    seniority?: string;
    languages?: string[];
}

export interface SearchPreferences {
    countries: string[];
    targetRole: string;
    remotePreference: RemotePreference;
    limitPerCountry: number;
    sites: string[];
}

export interface SelectedModel {
    provider: string;
    model: string;
}

export interface AvailableModel {
    id: string;
    name?: string;
    provider: string;
    providerCategory?: string;
    sourceProvider?: string;
    path?: string;
    localPath?: string;
    quotaInfo?: {
        remainingQuota?: number;
        totalQuota?: number;
        resetTime?: string;
        percentage?: number;
    };
    installed?: boolean;
}

export interface JobFinderPipelineResult {
    cvProfile: CvProfile;
    jobs: Job[];
    rankedJobs: Job[];
    aiSummary: string;
    fetchedAt: string;
}

export interface TengraBridge {
    registerExtensionComponent: (viewId: string, component: React.ComponentType<Record<string, unknown>>) => void;
}

export interface TengraMessage {
    id?: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

export interface TengraElectron {
    files?: {
        readPdf: (path: string) => Promise<string>;
        selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
        selectDirectory?: () => Promise<string | null>;
    };
    selectDirectory?: () => Promise<string | null>;
    modelRegistry?: {
        getInstalledModels: () => Promise<AvailableModel[]>;
        getAllModels?: () => Promise<AvailableModel[]>;
    };
    getModels?: () => Promise<AvailableModel[] | { antigravityError?: string }>;
    session?: {
        conversation?: {
            complete: (request: {
                messages: TengraMessage[];
                model: string;
                provider: string;
                tools?: unknown[];
                options?: Record<string, unknown>;
            }) => Promise<{ content?: string }>;
        };
    };
    ollama?: {
        chat?: (messages: TengraMessage[], model: string) => Promise<{ content: string; done: boolean }>;
    };
    export?: {
        pdf?: (htmlContent: string, filePath: string) => Promise<boolean | { success?: boolean; error?: string }>;
    };
}

declare global {
    interface Window {
        Tengra?: TengraBridge;
        electron?: TengraElectron;
        React: typeof React;
        ReactDOM: {
            createPortal?: typeof import('react-dom').createPortal;
            flushSync?: typeof import('react-dom').flushSync;
            unstable_batchedUpdates?: typeof import('react-dom').unstable_batchedUpdates;
            version?: string;
        };
    }
}
