import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';

export async function GET(request: NextRequest) {
  try {
    // Get repository path from query parameter or use current directory
    const { searchParams } = new URL(request.url);
    const repoPath = searchParams.get('path') || process.cwd();

    const gitService = new GitService(repoPath);
    
    if (!(await gitService.isGitRepository())) {
      return NextResponse.json(
        { success: false, error: 'Not a Git repository' },
        { status: 400 }
      );
    }

    const [branch, stagedChanges, recentCommits] = await Promise.all([
      gitService.getCurrentBranch(),
      gitService.getStagedChanges(),
      gitService.getRecentCommits(5)
    ]);

    // Get repository name for display
    const repoName = await gitService.getRepositoryName();

    return NextResponse.json({
      success: true,
      repository: {
        name: repoName,
        path: repoPath
      },
      branch,
      stagedChanges,
      recentCommits
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repository status' },
      { status: 500 }
    );
  }
}