'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch,
  GitCommit,
  FileText,
  Brain,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface GitDiff {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  diff: string;
}

interface StagedChanges {
  files: GitDiff[];
  summary: string;
  hasChanges: boolean;
}

interface CommitMessageSuggestion {
  type: 'feat' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore' | 'perf' | 'ci' | 'build';
  scope?: string;
  subject: string;
  body?: string;
  breaking?: boolean;
  fullMessage: string;
  confidence: number;
}

interface Repository {
  name: string;
  path: string;
}

export default function AICommitDashboard() {
  const [currentRepo, setCurrentRepo] = useState<Repository>({
    name: 'Current Repository',
    path: process.cwd()
  });
  const [repoInput, setRepoInput] = useState<string>('');
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [stagedChanges, setStagedChanges] = useState<StagedChanges | null>(null);
  const [suggestions, setSuggestions] = useState<CommitMessageSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CommitMessageSuggestion | null>(null);
  const [branch, setBranch] = useState<string>('');
  const [recentCommits, setRecentCommits] = useState<string[]>([]);

  const fetchStatus = async (repoPath?: string) => {
    try {
      const url = repoPath 
        ? `/api/ai-commit/status?path=${encodeURIComponent(repoPath)}`
        : '/api/ai-commit/status';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setStagedChanges(data.stagedChanges);
        setBranch(data.branch);
        setRecentCommits(data.recentCommits);
        setCurrentRepo({
          name: data.repository?.name || 'Current Repository',
          path: data.repository?.path || process.cwd()
        });
      } else {
        toast.error('Failed to fetch repository status');
      }
    } catch (error) {
      toast.error('Error fetching repository status');
    }
  };

  const generateSuggestions = async () => {
    if (!stagedChanges?.hasChanges) {
      toast.error('No staged changes to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai-commit/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verbosity: 'balanced',
          includeBody: true,
          maxTokens: 150,
          temperature: 0.7,
          repoPath: currentRepo.path
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.suggestions);
        toast.success('Commit suggestions generated successfully');
      } else {
        toast.error('Failed to generate suggestions');
      }
    } catch (error) {
      toast.error('Error generating suggestions');
    } finally {
      setLoading(false);
    }
  };

  const commitWithMessage = async (message: string) => {
    try {
      const response = await fetch('/api/ai-commit/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          repoPath: currentRepo.path
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Commit created successfully');
        await fetchStatus(currentRepo.path);
        setSuggestions([]);
        setSelectedSuggestion(null);
      } else {
        toast.error('Failed to create commit');
      }
    } catch (error) {
      toast.error('Error creating commit');
    }
  };

  const switchRepository = async (path: string) => {
    if (!path.trim()) {
      toast.error('Please select a valid repository');
      return;
    }

    try {
      await fetchStatus(path.trim());
      
      // Add to recent repositories
      setRecentRepos(prev => {
        const filtered = prev.filter(repo => repo !== path.trim());
        return [path.trim(), ...filtered].slice(0, 5);
      });
      
      setRepoInput('');
      toast.success(`Switched to repository: ${path.trim()}`);
    } catch (error) {
      toast.error('Failed to switch repository');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      feat: 'bg-green-100 text-green-800',
      fix: 'bg-red-100 text-red-800',
      refactor: 'bg-blue-100 text-blue-800',
      docs: 'bg-purple-100 text-purple-800',
      style: 'bg-yellow-100 text-yellow-800',
      test: 'bg-pink-100 text-pink-800',
      chore: 'bg-gray-100 text-gray-800',
      perf: 'bg-orange-100 text-orange-800',
      ci: 'bg-indigo-100 text-indigo-800',
      build: 'bg-teal-100 text-teal-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          AI Git Commit Assistant
        </h1>
        <p className="text-muted-foreground mb-6">
          Generate intelligent commit messages using local AI processing
        </p>

        {/* Repository Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Repository Selection
            </CardTitle>
            <CardDescription>
              Switch between different Git repositories or browse recent ones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Repository Dropdown */}
              <div className="flex gap-2">
                <select
                  value={currentRepo.path}
                  onChange={(e) => switchRepository(e.target.value)}
                  className="flex-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Select a repository...</option>
                  <option value={process.cwd()}>Current Directory</option>
                  {recentRepos.map((repo, index) => (
                    <option key={index} value={repo}>
                      {repo}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const path = prompt('Enter repository path:');
                    if (path) switchRepository(path);
                  }}
                >
                  Browse
                </Button>
              </div>

              {currentRepo.path !== process.cwd() && (
                <div className="p-2 bg-muted rounded text-sm">
                  <strong>Current Repository:</strong> {currentRepo.name} ({currentRepo.path})
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Current Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{branch || 'Loading...'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Staged Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stagedChanges?.files.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitCommit className="w-4 h-4" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{suggestions.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStatus(currentRepo.path)}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={generateSuggestions}
            disabled={loading || !stagedChanges?.hasChanges}
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate Suggestions
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <Tabs defaultValue="changes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="changes">Staged Changes</TabsTrigger>
            <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
            <TabsTrigger value="history">Recent Commits</TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Staged Changes</CardTitle>
                  <CardDescription>
                    {stagedChanges?.summary || 'Loading...'}
                  </CardDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStatus(currentRepo.path)}
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stagedChanges?.hasChanges ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {stagedChanges.files.map((file, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{file.file}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{file.status}</Badge>
                              <span className="text-sm text-green-600">
                                +{file.additions}
                              </span>
                              <span className="text-sm text-red-600">
                                -{file.deletions}
                              </span>
                            </div>
                          </div>
                          <ScrollArea className="h-32">
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {file.diff}
                            </pre>
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No staged changes</h3>
                    <p className="text-muted-foreground">
                      Stage some changes first using:
                      <code className="bg-muted p-2 rounded">git add .</code>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Suggestions
                  </CardTitle>
                  <CardDescription>
                    Generated {suggestions.length} commit message{suggestions.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {suggestions.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedSuggestion === suggestion ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedSuggestion(suggestion)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getTypeColor(suggestion.type)}>
                                  {suggestion.type}
                                  {suggestion.scope && `(${suggestion.scope})`}
                                </Badge>
                                <Badge variant="secondary" className="ml-2">
                                  {(suggestion.confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              </div>
                              <h4 className="font-medium">{suggestion.subject}</h4>
                              {suggestion.body && (
                                <pre className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap font-sans">
                                  {suggestion.body}
                                </pre>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSuggestion(suggestion)}
                              >
                                Select
                              </Button>
                            </div>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <pre className="text-xs">
                              {suggestion.fullMessage}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => selectedSuggestion && commitWithMessage(selectedSuggestion.fullMessage)}
                        disabled={!selectedSuggestion}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Commit with Selected Message
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSuggestion(null)}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No suggestions yet</h3>
                    <p className="text-muted-foreground">
                      Generate suggestions from your staged changes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Commits</CardTitle>
                <CardDescription>
                  Latest commit history for this repository
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentCommits.map((commit, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded">
                      <GitCommit className="w-4 h-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm">{commit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}