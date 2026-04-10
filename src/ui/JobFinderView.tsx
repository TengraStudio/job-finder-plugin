import React, { useState } from 'react';
import { 
    Briefcase, 
    Search, 
    FileText, 
    Globe, 
    MapPin, 
    Filter, 
    Download, 
    ChevronRight,
    CheckCircle2,
    TrendingUp
} from 'lucide-react';

/**
 * Job Finder Plugin Main View
 */
export const JobFinderView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [atsScore, setAtsScore] = useState<number | null>(null);
    const [scanning, setScanning] = useState(false);

    const handleScanCV = () => {
        setScanning(true);
        setTimeout(() => {
            setAtsScore(85);
            setScanning(false);
        }, 2000);
    };

    return (
        <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
            {/* Header */}
            <header className="p-8 border-b border-border/50 bg-tech-grid bg-tech-grid-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Briefcase className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="typo-h1 font-bold tracking-tight">Job Finder</h1>
                            <p className="typo-body text-muted-foreground">AI-Powered Career Assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full bg-success/10 text-success text-xxs font-mono border border-success/20">
                            STATUS: CONNECTED
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search for roles, skills, or companies..."
                        className="w-full h-14 pl-12 pr-4 bg-muted/30 border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all typo-body"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* CV Analysis Section */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-3xl border border-border/50 hover:border-primary/30 transition-all group">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3 className="typo-h3 font-bold">Resume Analysis</h3>
                        </div>
                        
                        {atsScore !== null ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-end gap-4">
                                    <div className="text-5xl font-bold text-primary">{atsScore}%</div>
                                    <div className="mb-2 typo-body text-muted-foreground">ATS Score</div>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-1000 ease-out" 
                                        style={{ width: `${atsScore}%` }}
                                    />
                                </div>
                                <div className="p-4 rounded-xl bg-success/5 border border-success/20 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                                    <p className="text-sm text-foreground/80">
                                        Your resume is highly optimized for technical roles. Consider adding more "Cloud Infrastructure" keywords.
                                    </p>
                                </div>
                                <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                                    View Detailed Feedback
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4 group-hover:border-primary/40 transition-colors">
                                    <Download className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <p className="typo-body font-medium mb-1">No Resume Uploaded</p>
                                <p className="text-xs text-muted-foreground mb-4">Upload your CV to get an instant ATS score</p>
                                <button 
                                    onClick={handleScanCV}
                                    disabled={scanning}
                                    className="px-6 py-2.5 rounded-xl bg-muted/50 border border-border text-sm font-bold hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    {scanning ? 'Analyzing...' : 'Scan Resume'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-border/50 hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-orange-500" />
                            </div>
                            <h3 className="typo-h3 font-bold">Market Trends</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/30">
                                <span className="text-sm font-medium">React Native</span>
                                <span className="text-xs font-mono text-success">+12% demand</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/30">
                                <span className="text-sm font-medium">Rust Engineering</span>
                                <span className="text-xs font-mono text-success">+24% demand</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/30">
                                <span className="text-sm font-medium">AI Integration</span>
                                <span className="text-xs font-mono text-success">+45% demand</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Job Listings Section */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="typo-h2 font-bold flex items-center gap-2">
                            Recent Listings 
                            <span className="px-2 py-0.5 rounded-md bg-muted text-xxs font-mono text-muted-foreground uppercase">REAL-TIME</span>
                        </h2>
                        <div className="flex gap-2">
                            <button className="p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors text-muted-foreground">
                                <Filter className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors text-muted-foreground">
                                <Globe className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[
                            { title: 'Senior AI Engineer', company: 'DeepMind', location: 'London, UK / Remote', salary: '$180k - $240k' },
                            { title: 'Full Stack Developer', company: 'Linear', location: 'San Francisco, CA', salary: '$150k - $190k' },
                            { title: 'Product Designer', company: 'Vercel', location: 'Remote', salary: '$130k - $170k' },
                        ].map((job, i) => (
                            <div 
                                key={i}
                                className="group p-5 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center font-bold text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all">
                                        {job.company[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{job.title}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.company}</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:block text-right">
                                        <p className="text-sm font-bold text-foreground">{job.salary}</p>
                                        <p className="text-xxs text-muted-foreground font-mono uppercase">Full-Time</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Empty State / Bottom Info */}
            <footer className="p-4 border-t border-border/30 bg-muted/10 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                    System updated 2 minutes ago • Powered by Tengra AI Analysis
                </p>
            </footer>
        </div>
    );
};
