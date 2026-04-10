import type { CvProfile } from '../types';
import { createProfileFromText } from '../services/cvService';
import { refineCvProfileWithAi } from '../services/tengraAiClient';

export function parseCv(text: string): CvProfile {
    return createProfileFromText(text);
}

export async function refineCvWithAi(text: string, model: string): Promise<Partial<CvProfile> | null> {
    return refineCvProfileWithAi(text, { provider: 'ollama', model });
}
