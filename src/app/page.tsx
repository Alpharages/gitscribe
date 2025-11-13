import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, GitBranch, Terminal, Shield, Zap, Code } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Brain className="w-20 h-20 text-blue-600" />
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Git Commit Assistant
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Generate intelligent, structured Git commit messages using IBM's Granite 4.0-h-1b model. 
            All processing happens locally on your machine - complete privacy, zero cloud dependencies.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/ai-commit">
              <Button size="lg" className="px-8">
                <Brain className="w-5 h-5 mr-2" />
                Launch Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8">
              <Terminal className="w-5 h-5 mr-2" />
              CLI Usage
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Shield className="w-10 h-10 text-green-600 mb-2" />
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>
                All code analysis and AI processing happens locally on your machine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• No data sent to cloud</li>
                <li>• Works offline</li>
                <li>• Zero external dependencies</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-10 h-10 text-yellow-600 mb-2" />
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Local AI processing with optimized models for quick commit generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Sub-second generation</li>
                <li>• Efficient memory usage</li>
                <li>• No network latency</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Code className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>Smart Analysis</CardTitle>
              <CardDescription>
                Context-aware commit messages following conventional commit standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Conventional commits</li>
                <li>• Type detection</li>
                <li>• Scope inference</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Stage Changes</h3>
              <p className="text-sm text-gray-600">
                Use git add to stage the files you want to commit
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600">
                Local AI analyzes your code changes and understands the intent
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Generate Messages</h3>
              <p className="text-sm text-gray-600">
                Get multiple conventional commit suggestions with confidence scores
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="font-semibold mb-2">Commit</h3>
              <p className="text-sm text-gray-600">
                Select the best message or auto-commit with the highest confidence
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-6">CLI Usage</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-blue-400">Review staged changes</h3>
              <pre className="bg-gray-800 p-4 rounded-lg text-sm">
                <code>npm run ai-commit review</code>
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-blue-400">Auto-commit</h3>
              <pre className="bg-gray-800 p-4 rounded-lg text-sm">
                <code>npm run ai-commit commit</code>
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-blue-400">Check status</h3>
              <pre className="bg-gray-800 p-4 rounded-lg text-sm">
                <code>npm run ai-commit status</code>
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-blue-400">Configure settings</h3>
              <pre className="bg-gray-800 p-4 rounded-lg text-sm">
                <code>npm run ai-commit config</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Powered by IBM Granite 4.0-h-1b • Built with Next.js & Transformers.js
          </p>
          <div className="flex justify-center gap-4">
            <Badge variant="secondary">Local AI</Badge>
            <Badge variant="secondary">Privacy-Preserving</Badge>
            <Badge variant="secondary">Conventional Commits</Badge>
            <Badge variant="secondary">TypeScript</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}