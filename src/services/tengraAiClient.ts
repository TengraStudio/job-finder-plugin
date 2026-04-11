import type { AvailableModel, CvProfile, SelectedModel, TengraMessage } from '../types';

function message(role: TengraMessage['role'], content: string, index: number): TengraMessage {
    return {
        id: `job-finder-${Date.now()}-${index}`,
        role,
        content,
        timestamp: new Date()
    };
}

function extractJsonObject(text: string): unknown | null {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] ?? text;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        return JSON.parse(candidate.slice(start, end + 1));
    } catch {
        return null;
    }
}

function cleanStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 40);
}

function normalizeProfile(value: unknown): Partial<CvProfile> | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const remotePreference = record.remotePreference;

    return {
        summary: typeof record.summary === 'string' ? record.summary.trim() : undefined,
        skills: cleanStringArray(record.skills),
        preferredLocations: cleanStringArray(record.preferredLocations),
        preferredCountries: cleanStringArray(record.preferredCountries),
        targetRoles: cleanStringArray(record.targetRoles),
        seniority: typeof record.seniority === 'string' ? record.seniority.trim() : undefined,
        languages: cleanStringArray(record.languages),
        remotePreference:
            remotePreference === 'remote' ||
            remotePreference === 'on-site' ||
            remotePreference === 'hybrid' ||
            remotePreference === 'any'
                ? remotePreference
                : undefined
    };
}

function modelProvider(model: AvailableModel): string {
    return model.providerCategory || model.sourceProvider || model.provider || 'ollama';
}

function modelId(model: AvailableModel): string {
    return model.id || model.name || model.path || model.localPath || '';
}

function normalizeModels(models: AvailableModel[]): AvailableModel[] {
    const seen = new Set<string>();
    const normalized: AvailableModel[] = [];

    for (const model of models) {
        const id = modelId(model).trim();
        if (!id) continue;

        const provider = modelProvider(model).trim() || 'ollama';
        const key = `${provider}:${id}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        normalized.push({
            ...model,
            id,
            name: model.name || id,
            provider
        });
    }

    return normalized.sort((a, b) => `${a.provider}:${a.name ?? a.id}`.localeCompare(`${b.provider}:${b.name ?? b.id}`));
}

export async function listTengraModels(): Promise<AvailableModel[]> {
    const proxyModels = await window.electron?.getProxyModels?.().catch(() => null);
    if (proxyModels?.data && proxyModels.data.length > 0) {
        return normalizeModels(proxyModels.data);
    }

    const models = await window.electron?.getModels?.().catch(() => []);
    if (Array.isArray(models) && models.length > 0) {
        return normalizeModels(models);
    }

    const registryModels = await window.electron?.modelRegistry?.getInstalledModels?.().catch(() => []);
    if (registryModels && registryModels.length > 0) return normalizeModels(registryModels);

    const allRegistryModels = await window.electron?.modelRegistry?.getAllModels?.().catch(() => []);
    if (allRegistryModels && allRegistryModels.length > 0) return normalizeModels(allRegistryModels);

    return [];
}

export async function completeWithTengraAi(
    selectedModel: SelectedModel,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    if (!selectedModel.model) {
        throw new Error('Please select an AI model first.');
    }

    const messages = [
        message('system', systemPrompt, 1),
        message('user', userPrompt, 2)
    ];

    const conversation = window.electron?.session?.conversation;
    if (conversation?.complete) {
        const result = await conversation.complete({
            messages,
            model: selectedModel.model,
            provider: selectedModel.provider || 'ollama',
            tools: [],
            options: { temperature: 0.1 }
        });
        if (result?.content) return result.content;
    }

    const ollama = window.electron?.ollama;
    if (ollama?.chat) {
        const result = await ollama.chat(messages, selectedModel.model);
        if (result?.content) return result.content;
    }

    throw new Error('Tengra AI bridge is not available in this runtime.');
}

export async function refineCvProfileWithAi(
    cvText: string,
    selectedModel: SelectedModel
): Promise<Partial<CvProfile> | null> {
    const systemPrompt = [
        'You extract structured candidate profiles from CV text.',
        'Return only valid JSON. Do not include markdown.',
        'Use English keys exactly as requested.'
    ].join(' ');

    const userPrompt = `
Extract this JSON shape:
{
  "summary": "two sentence professional summary",
  "skills": ["skill"],
  "preferredLocations": ["city or region"],
  "preferredCountries": ["country"],
  "targetRoles": ["role"],
  "remotePreference": "remote | on-site | hybrid | any",
  "seniority": "junior | mid | senior | lead | executive | unknown",
  "languages": ["language"]
}

CV:
${cvText.slice(0, 12000)}
`;

    const response = await completeWithTengraAi(selectedModel, systemPrompt, userPrompt);
    return normalizeProfile(extractJsonObject(response));
}

export async function summarizeMatchesWithAi(
    profile: CvProfile,
    jobs: Array<{ title: string; company: string; location: string; score: number }>,
    selectedModel: SelectedModel
): Promise<string | null> {
    if (jobs.length === 0) return null;

    const systemPrompt = 'You summarize job search results in one concise paragraph for the candidate.';
    const userPrompt = `Candidate profile: ${JSON.stringify(profile)}
Top jobs: ${JSON.stringify(jobs.slice(0, 8))}
Write a concise summary with the strongest fit pattern.`;

    return completeWithTengraAi(selectedModel, systemPrompt, userPrompt).catch(() => null);
}
