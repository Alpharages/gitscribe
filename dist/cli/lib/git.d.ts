export interface GitDiff {
    file: string;
    status: string;
    additions: number;
    deletions: number;
    diff: string;
}
export interface StagedChanges {
    files: GitDiff[];
    summary: string;
    hasChanges: boolean;
}
export declare class GitService {
    private git;
    constructor(basePath?: string);
    isGitRepository(): Promise<boolean>;
    getStagedChanges(): Promise<StagedChanges>;
    getCurrentBranch(): Promise<string>;
    getRecentCommits(limit?: number): Promise<string[]>;
    commit(message: string): Promise<void>;
    getRepositoryName(): Promise<string>;
}
//# sourceMappingURL=git.d.ts.map