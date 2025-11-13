import simpleGit, { SimpleGit } from 'simple-git';

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

export class GitService {
  private git: SimpleGit;

  constructor(basePath: string = process.cwd()) {
    this.git = simpleGit(basePath);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getStagedChanges(): Promise<StagedChanges> {
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

      const diffs: GitDiff[] = [];

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
        } catch (error) {
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
    } catch (error) {
      throw new Error(`Failed to get staged changes: ${error}`);
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'main';
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error}`);
    }
  }

  async getRecentCommits(limit: number = 5): Promise<string[]> {
    try {
      const log = await this.git.log({ maxCount: limit });
      return log.all.map(commit => commit.message);
    } catch (error) {
      throw new Error(`Failed to get recent commits: ${error}`);
    }
  }

  async commit(message: string): Promise<void> {
    try {
      await this.git.commit(message);
    } catch (error) {
      throw new Error(`Failed to commit: ${error}`);
    }
  }

  async getRepositoryName(): Promise<string> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      if (origin?.refs?.fetch) {
        return origin.refs.fetch.split('/').pop()?.replace('.git', '') || 'unknown';
      }
      return process.cwd().split('/').pop() || 'unknown';
    } catch {
      return process.cwd().split('/').pop() || 'unknown';
    }
  }
}