export type Language = 'en' | 'tr';

export const translations = {
    en: {
        title: 'Job Finder',
        subtitle: 'CV parse + live job fetch + ranked shortlist',
        analyze: 'Analyze Jobs',
        analyzing: 'Analyzing...',
        cvInput: 'CV Input',
        loadPdf: 'Load PDF',
        placeholder: 'Paste CV text or load a PDF...',
        liveAnalysis: 'Live Analysis',
        jobsRanked: 'jobs ranked from live sources',
        topRecommendation: 'Top recommendation',
        rankedJobs: 'Ranked Jobs',
        results: 'results',
        openListing: 'Open listing',
        noJobs: 'No jobs found for the current CV profile.',
        match: 'match',
        skills: 'Skills',
        location: 'Location',
        source: 'Source',
        steps: {
            parse: 'Parse PDF',
            normalize: 'Normalize CV',
            fetch: 'Fetch live jobs',
            rank: 'Rank results'
        }
    },
    tr: {
        title: 'İş Bulucu',
        subtitle: 'CV ayrıştırma + canlı iş çekme + sıralı liste',
        analyze: 'İşleri Analiz Et',
        analyzing: 'Analiz ediliyor...',
        cvInput: 'CV Girişi',
        loadPdf: 'PDF Yükle',
        placeholder: 'CV metnini yapıştırın veya bir PDF yükleyin...',
        liveAnalysis: 'Canlı Analiz',
        jobsRanked: 'canlı kaynaklardan sıralanan işler',
        topRecommendation: 'En iyi tavsiye',
        rankedJobs: 'Sıralanan İşler',
        results: 'sonuç',
        openListing: 'İlanı aç',
        noJobs: 'Mevcut CV profili için iş bulunamadı.',
        match: 'eşleşme',
        skills: 'Beceriler',
        location: 'Konum',
        source: 'Kaynak',
        steps: {
            parse: 'PDF Ayrıştır',
            normalize: 'CV Normalleştir',
            fetch: 'Canlı işleri çek',
            rank: 'Sonuçları sırala'
        }
    }
};

export type TranslationKeys = typeof translations.en;
