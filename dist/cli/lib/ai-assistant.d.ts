import { StagedChanges } from './git';
export interface CommitMessageSuggestion {
    type: 'feat' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore' | 'perf' | 'ci' | 'build';
    scope?: string;
    subject: string;
    body?: string;
    breaking?: boolean;
    fullMessage: string;
    confidence: number;
}
export interface AIProcessingOptions {
    maxTokens?: number;
    temperature?: number;
    verbosity?: 'concise' | 'detailed' | 'balanced';
    includeBody?: boolean;
    customPrompt?: string;
}
export declare class AICommitAssistant {
    private modelId;
    private model;
    private modelLoaded;
    constructor(modelId?: string);
    loadModel(): Promise<void>;
    generateCommitMessage(changes: StagedChanges, options?: AIProcessingOptions): Promise<CommitMessageSuggestion[]>;
    private generateAIBasedSuggestions;
    private buildPrompt;
    private analyzeChanges;
    private identifyFilePatterns;
    private parseAIResponse;
    private generateFallbackSuggestions;
    private analyzeDiffsInDepth;
    private analyzeChangesForFallback;
    private generateSmartSubject;
    private generateSmartBody;
    private generateWhyItMatters;
    private generateSmartScope;
    private findMostCommon;
}
//# sourceMappingURL=ai-assistant.d.ts.map