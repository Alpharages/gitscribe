"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
class GitService {
    git;
    constructor(basePath = process.cwd()) {
        this.git = (0, simple_git_1.default)(basePath);
    }
    async isGitRepository() {
        try {
            await this.git.status();
            return true;
        }
        catch {
            return false;
        }
    }
    async getStagedChanges() {
        try {
            const status = await this.git.status();
            const stagedFiles = status.staged;
            if (stagedFiles.length === 0) {
                return {
                    files: [],
                    summary: 'No staged changes found',
                    hasChanges: false
                };
            }
            const diffs = [];
            for (const file of stagedFiles) {
                try {
                    const diff = await this.git.diff(['--cached', file]);
                    const diffLines = diff.split('\n');
                    const additions = diffLines.filter(line => line.startsWith('+')).length;
                    const deletions = diffLines.filter(line => line.startsWith('-')).length;
                    diffs.push({
                        file,
                        status: status.files.find(f => f.path === file)?.index || 'M',
                        additions,
                        deletions,
                        diff
                    });
                }
                catch (error) {
                    console.warn(`Failed to get diff for ${file}:`, error);
                }
            }
            const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
            const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);
            return {
                files: diffs,
                summary: `${diffs.length} file(s) changed, ${totalAdditions} insertions(+), ${totalDeletions} deletions(-)`,
                hasChanges: true
            };
        }
        catch (error) {
            throw new Error(`Failed to get staged changes: ${error}`);
        }
    }
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return status.current || 'main';
        }
        catch (error) {
            throw new Error(`Failed to get current branch: ${error}`);
        }
    }
    async getRecentCommits(limit = 5) {
        try {
            const log = await this.git.log({ maxCount: limit });
            return log.all.map(commit => commit.message);
        }
        catch (error) {
            throw new Error(`Failed to get recent commits: ${error}`);
        }
    }
    async commit(message) {
        try {
            await this.git.commit(message);
        }
        catch (error) {
            throw new Error(`Failed to commit: ${error}`);
        }
    }
    async getRepositoryName() {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            if (origin?.refs?.fetch) {
                return origin.refs.fetch.split('/').pop()?.replace('.git', '') || 'unknown';
            }
            return process.cwd().split('/').pop() || 'unknown';
        }
        catch {
            return process.cwd().split('/').pop() || 'unknown';
        }
    }
}
exports.GitService = GitService;
//# sourceMappingURL=git.js.map