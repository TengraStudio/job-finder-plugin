import type { CvDraft, CvProfile, RemotePreference, SelectedModel } from '../types';
import { refineCvProfileWithAi } from './tengraAiClient';

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function splitList(value: string): string[] {
    return unique(value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean));
}

function detectRemotePreference(text: string): RemotePreference {
    const normalized = text.toLowerCase();
    if (normalized.includes('hybrid')) return 'hybrid';
    if (normalized.includes('remote only') || normalized.includes('full remote') || normalized.includes('remote')) return 'remote';
    if (normalized.includes('on-site') || normalized.includes('onsite') || normalized.includes('office')) return 'on-site';
    return 'any';
}

function normalizeLine(line: string): string {
    return line.replace(/^[\s\-*•]+/, '').replace(/\s+/g, ' ').trim();
}

function extractSection(text: string, names: string[]): string {
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex(line => {
        const normalized = normalizeLine(line).toLowerCase().replace(/:$/, '');
        return names.some(name => normalized === name);
    });

    if (start === -1) return '';

    const next = lines.findIndex((line, index) => {
        if (index <= start) return false;
        const normalized = normalizeLine(line).toLowerCase().replace(/:$/, '');
        return normalized.length > 0 &&
            normalized.length <= 40 &&
            ['summary', 'profile', 'skills', 'technologies', 'experience', 'employment', 'education', 'languages', 'links', 'projects']
                .includes(normalized);
    });

    return lines.slice(start + 1, next === -1 ? undefined : next).join('\n').trim();
}

function parseDelimitedSection(section: string, limit = 30): string[] {
    return unique(
        section
            .split(/[,;\n|]/)
            .map(normalizeLine)
            .filter(item => item.length >= 2 && item.length <= 80)
    ).slice(0, limit);
}

function inferTargetRoles(text: string): string[] {
    const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
    const headline = lines.slice(1, 4).find(line =>
        line.length <= 120 &&
        !line.includes('@') &&
        !/^\+?\d[\d\s().-]+$/.test(line)
    );
    return headline ? [headline] : [];
}

function inferSeniority(text: string): string | undefined {
    const firstPage = text.slice(0, 1500).toLowerCase();
    const match = firstPage.match(/\b(intern|junior|mid(?:-level)?|senior|staff|principal|lead|manager|director|head|vp|cto)\b/);
    return match?.[1];
}

export function buildCvTextFromDraft(draft: CvDraft): string {
    return [
        draft.fullName,
        draft.headline,
        draft.email || draft.phone || draft.location ? `${draft.email} ${draft.phone} ${draft.location}`.trim() : '',
        '',
        'Summary',
        draft.summary,
        '',
        'Skills',
        draft.skills,
        '',
        'Experience',
        draft.experience,
        '',
        'Education',
        draft.education,
        '',
        'Links',
        draft.links
    ].filter(line => line !== undefined && line !== null).join('\n').trim();
}

export function createProfileFromText(text: string): CvProfile {
    const summarySection = extractSection(text, ['summary', 'profile']);
    const skillsSection = extractSection(text, ['skills', 'technologies']);
    const languagesSection = extractSection(text, ['languages']);

    return {
        summary: summarySection || text.slice(0, 700).trim(),
        skills: parseDelimitedSection(skillsSection),
        preferredLocations: [],
        preferredCountries: [],
        remotePreference: detectRemotePreference(text),
        targetRoles: inferTargetRoles(text),
        seniority: inferSeniority(text),
        languages: parseDelimitedSection(languagesSection, 12)
    };
}

export async function createProfile(
    cvText: string,
    selectedModel: SelectedModel | null
): Promise<CvProfile> {
    const baseProfile = createProfileFromText(cvText);
    if (!selectedModel?.model) return baseProfile;

    const refined = await refineCvProfileWithAi(cvText, selectedModel).catch(() => null);
    if (!refined) return baseProfile;

    return {
        ...baseProfile,
        ...refined,
        skills: unique([...(refined.skills ?? []), ...baseProfile.skills]),
        preferredLocations: unique([...(refined.preferredLocations ?? []), ...baseProfile.preferredLocations]),
        preferredCountries: unique([...(refined.preferredCountries ?? []), ...baseProfile.preferredCountries]),
        targetRoles: unique([...(refined.targetRoles ?? []), ...baseProfile.targetRoles]),
        languages: unique([...(refined.languages ?? []), ...(baseProfile.languages ?? [])]),
        remotePreference: refined.remotePreference ?? baseProfile.remotePreference
    };
}

export function mergeSearchCountries(input: string, profile: CvProfile): string[] {
    const selected = splitList(input);
    return selected.length > 0 ? selected : profile.preferredCountries;
}

export function cvDraftToHtml(draft: CvDraft): string {
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char] ?? char));

    const section = (title: string, content: string) => content.trim()
        ? `<h2>${escape(title)}</h2><p>${escape(content).replace(/\n/g, '<br>')}</p>`
        : '';

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 42px; line-height: 1.45; }
    h1 { margin: 0; font-size: 30px; }
    h2 { margin: 24px 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    p { margin: 0; white-space: normal; }
    .headline { color: #374151; font-size: 16px; margin-top: 4px; }
    .meta { color: #4b5563; font-size: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>${escape(draft.fullName || 'CV')}</h1>
  <p class="headline">${escape(draft.headline)}</p>
  <p class="meta">${escape([draft.email, draft.phone, draft.location].filter(Boolean).join(' | '))}</p>
  ${section('Summary', draft.summary)}
  ${section('Skills', draft.skills)}
  ${section('Experience', draft.experience)}
  ${section('Education', draft.education)}
  ${section('Links', draft.links)}
</body>
</html>`;
}

export async function exportDraftToPdf(draft: CvDraft): Promise<string> {
    const directory = await (window.electron?.files?.selectDirectory?.() ?? window.electron?.selectDirectory?.());
    if (!directory) throw new Error('Please choose a folder for the CV PDF.');

    const safeName = (draft.fullName || 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
    const separator = directory.includes('\\') ? '\\' : '/';
    const outputPath = `${directory}${directory.endsWith(separator) ? '' : separator}${safeName}-${Date.now()}.pdf`;
    const result = await window.electron?.export?.pdf?.(cvDraftToHtml(draft), outputPath);
    if (result === true || (result && typeof result === 'object' && result.success)) return outputPath;
    throw new Error(result && typeof result === 'object' && result.error ? result.error : 'PDF export failed.');
}
