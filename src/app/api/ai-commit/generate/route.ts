import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';
import { AICommitAssistant } from '@/lib/ai-assistant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verbosity = 'balanced', includeBody = true, maxTokens = 150, temperature = 0.7, repoPath } = body;

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
        { success: false, error: 'No staged changes found' },
        { status: 400 }
      );
    }

    const aiAssistant = new AICommitAssistant();
    await aiAssistant.loadModel();

    const suggestions = await aiAssistant.generateCommitMessage(changes, {
      verbosity,
      includeBody,
      maxTokens,
      temperature
    });

    return NextResponse.json({
      success: true,
      suggestions,
      repository: {
        name: await gitService.getRepositoryName(),
        path: repoPath || process.cwd()
      }
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate commit suggestions' },
      { status: 500 }
    );
  }
}