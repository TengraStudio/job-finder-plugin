import type { CvProfile, Job, JobMatch } from '../types';

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scoreJob(profile: CvProfile, job: Job): JobMatch {
    const jobText = [
        job.title,
        job.description ?? '',
        job.skills?.join(' ') ?? ''
    ].join(' ').toLowerCase();
    
    // 1. Skill Matching (Weight: 40%)
    const skillMatches = profile.skills.filter(skill => {
        const regex = new RegExp(`(^|\\W)${escapeRegExp(skill.toLowerCase())}(?=\\W|$)`, 'i');
        return regex.test(jobText);
    });
    const skillScore = profile.skills.length > 0 
        ? (skillMatches.length / profile.skills.length) * 40 
        : 0;

    // 2. Role Matching (Weight: 30%)
    const roleMatches = profile.targetRoles.some(role => {
        const regex = new RegExp(`(^|\\W)${escapeRegExp(role.toLowerCase())}(?=\\W|$)`, 'i');
        return regex.test(job.title.toLowerCase());
    });
    const roleScore = roleMatches ? 30 : 0;

    // 3. Remote Preference (Weight: 20%)
    let remoteScore = 0;
    if (profile.remotePreference === 'any') {
        remoteScore = 20;
    } else if (profile.remotePreference === 'remote' && job.remote) {
        remoteScore = 20;
    } else if (profile.remotePreference === 'on-site' && !job.remote) {
        remoteScore = 20;
    } else if (profile.remotePreference === 'hybrid') {
        remoteScore = job.remote || job.location.toLowerCase().includes('hybrid') ? 15 : 10;
    }

    // 4. Bonus for Country Match (Weight: 10%)
    const countryMatch = profile.preferredCountries.some(country => 
        job.location.toLowerCase().includes(country.toLowerCase())
    );
    const countryScore = countryMatch ? 10 : 0;

    const totalScore = Math.min(100, Math.round(skillScore + roleScore + remoteScore + countryScore));

    const reasons: string[] = [];
    if (skillMatches.length > 0) reasons.push(`${skillMatches.length} matching skills`);
    if (roleMatches) reasons.push('Role matches target profile');
    if (countryMatch) reasons.push('Location matches preferred country');
    if (profile.remotePreference !== 'any' && remoteScore > 0) reasons.push('Remote preference satisfied');

    return {
        score: totalScore,
        fit: totalScore >= 80 ? 'recommended' : totalScore >= 60 ? 'workable' : totalScore >= 40 ? 'limited' : 'blocked',
        reasons: reasons.length > 0 ? reasons : ['Needs manual review']
    };
}
