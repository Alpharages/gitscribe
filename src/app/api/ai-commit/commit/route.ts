import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, repoPath } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Commit message is required' },
        { status: 400 }
      );
    }

    // Use provided path or default to current directory
    const gitService = new GitService(repoPath || process.cwd());
    
    if (!(await gitService.isGitRepository())) {
      return NextResponse.json(
        { success: false, error: 'Not a Git repository' },
        { status: 400 }
      );
    }

    const changes = await gitService.getStagedChanges();
    
    if (!changes.hasChanges) {
      return NextResponse.json(
        { success: false, error: 'No staged changes to commit' },
        { status: 400 }
      );
    }

    await gitService.commit(message);

    return NextResponse.json({
      success: true,
      message: 'Commit created successfully',
      repository: {
        name: await gitService.getRepositoryName(),
        path: repoPath || process.cwd()
      },
      commitMessage: message
    });
  } catch (error) {
    console.error('Commit API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create commit' },
      { status: 500 }
    );
  }
}