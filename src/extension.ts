interface ExtensionContext {
    subscriptions: Array<{ dispose(): void }>;
    logger: {
        info(message: string, ...args: unknown[]): void;
        warn(message: string, ...args: unknown[]): void;
        error(message: string, error?: Error): void;
    };
    commands?: {
        registerCommand(commandId: string, handler: (...args: unknown[]) => unknown | Promise<unknown>): { dispose(): void };
    };
}

export const activate = (context: ExtensionContext) => {
    context.logger.info('Job Finder extension activated.');

    const searchCommand = context.commands?.registerCommand('job-finder.search', async params => {
        context.logger.info('Job Finder search requested.', params);
        return {
            success: false,
            reason: 'Use the Job Finder view. The pipeline runs in the renderer through Tengra AI and file bridges.'
        };
    });

    const analyzeCommand = context.commands?.registerCommand('job-finder.analyze-cv', async () => {
        context.logger.info('Job Finder CV analysis requested.');
        return {
            success: false,
            reason: 'Use the Job Finder view so the selected Tengra model can be passed with the request.'
        };
    });

    void searchCommand;
    void analyzeCommand;
};

export const deactivate = () => undefined;

export default {
    activate,
    deactivate
};
