"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICommitAssistant = void 0;
const transformers_1 = require("@huggingface/transformers");
class AICommitAssistant {
    modelId;
    model = null;
    modelLoaded = false;
    constructor(modelId) {
        // Priority: 1. Constructor param, 2. Environment variable, 3. Default
        // Note: IBM Granite models are not yet supported by Transformers.js
        // Using Llama 3.2 1B Instruct as default (high quality, instruction-tuned)
        this.modelId = modelId
            || process.env.AI_COMMIT_MODEL
            || 'meta-llama/Llama-3.2-1B-Instruct';
    }
    async loadModel() {
        if (this.modelLoaded) {
            return;
        }
        try {
            console.log(`🤖 Loading AI model: ${this.modelId}...`);
            // Load text generation pipeline with official @huggingface/transformers
            this.model = await (0, transformers_1.pipeline)('text-generation', this.modelId);
            this.modelLoaded = true;
            console.log('✅ AI model loaded successfully!');
        }
        catch (error) {
            console.warn('⚠️  Failed to load AI model, will use fallback logic:', error);
            this.modelLoaded = false;
        }
    }
    async generateCommitMessage(changes, options = {}) {
        // Try AI-based generation first
        try {
            if (!this.modelLoaded) {
                await this.loadModel();
            }
            if (this.modelLoaded && this.model) {
                const aiSuggestions = await this.generateAIBasedSuggestions(changes, options);
                if (aiSuggestions && aiSuggestions.length > 0) {
                    return aiSuggestions;
                }
                else {
                    console.warn('⚠️  AI generated output but parser found no valid commit messages, using fallback');
                }
            }
        }
        catch (error) {
            console.warn('⚠️  AI generation failed, using fallback:', error);
        }
        // Fall back to heuristic-based suggestions
        console.log('📋 Using intelligent fallback for commit message generation');
        return this.generateFallbackSuggestions(changes);
    }
    async generateAIBasedSuggestions(changes, options) {
        const prompt = this.buildPrompt(changes, options);
        const result = await this.model(prompt, {
            max_new_tokens: options.maxTokens || 150,
            temperature: options.temperature || 0.7,
            do_sample: true,
            top_p: 0.9,
        });
        // Parse AI response into structured commit suggestions
        const generatedText = result[0]?.generated_text || '';
        // Debug: Log what AI generated (only in verbose mode)
        if (process.env.AI_COMMIT_DEBUG) {
            console.log('🔍 AI Generated Text:', generatedText.substring(0, 500));
        }
        return this.parseAIResponse(generatedText, changes);
    }
    buildPrompt(changes, options) {
        const verbosity = options.verbosity || 'balanced';
        const includeBody = options.includeBody !== false; // Default to true
        const customPrompt = options.customPrompt;
        // Analyze changes to extract meaningful context
        const changeAnalysis = this.analyzeChanges(changes);
        // For large changesets (>20 files), use summary approach
        const isLargeChangeset = changes.files.length > 20;
        const fileLimit = isLargeChangeset ? 5 : 10;
        const diffLimit = isLargeChangeset ? 2 : 5;
        // Build context from changes (limit files to avoid token overflow)
        let filesContext = changes.files.slice(0, fileLimit).map(f => `- ${f.file} (${f.status}): +${f.additions} -${f.deletions}`).join('\n');
        if (isLargeChangeset) {
            filesContext += `\n... and ${changes.files.length - fileLimit} more files`;
        }
        // Get more comprehensive diff context
        const diffContext = changes.files.slice(0, diffLimit).map(f => {
            const diffLines = f.diff.split('\n');
            const relevantLines = diffLines.filter(line => line.startsWith('+') || line.startsWith('-') || line.startsWith('@@')).slice(0, 30);
            return `File: ${f.file}\n${relevantLines.join('\n')}`;
        }).join('\n---\n');
        let basePrompt = `You are an expert at analyzing code changes and writing informative Git commit messages following Conventional Commits specification.

ANALYZE these code changes and write a commit message that explains WHAT was done and WHY:

Files changed:
${filesContext}

Change analysis:
${changeAnalysis}

${diffContext ? `Code diff (what actually changed):\n${diffContext}\n` : ''}

${isLargeChangeset ? `\n⚠️ LARGE CHANGESET (${changes.files.length} files): Focus on the OVERALL THEME and PRIMARY PURPOSE, not individual files. Describe the main feature, refactoring, or change being implemented.\n` : ''}

IMPORTANT: Write a commit message that describes the PURPOSE and IMPACT of changes, NOT just listing files.

Good example format:
fix: cleanup ClickUp integration formatting and improve tool handler readability

- Fixed inconsistent formatting in clickup-story-client.ts and tool-handler.ts
- Improved code readability by reformatting multi-line statements
- Enhanced error handling comments for better debugging clarity
- Added detailed documentation files explaining ClickUp-related fixes

Bad example (DO NOT DO THIS):
docs(docs): update file1.ts, file2.ts, file3.ts, file4.ts

Generate a conventional commit message with:
1. First line: type(scope): brief description of the change (max 72 chars)
- Type: feat, fix, refactor, docs, style, test, chore, perf, ci, or build
   - Scope: affected module/component (optional)
   - Description: what was accomplished, not what files changed

2. Body (required for multi-file changes): bullet points explaining:
   - What specific improvements were made
   - Why these changes matter
   - Key files or components affected (only if relevant)

Focus on the MEANING and PURPOSE of the changes, not just file names.`;
        if (customPrompt) {
            basePrompt += `\n\nAdditional instructions: ${customPrompt}`;
        }
        if (verbosity === 'concise') {
            basePrompt += '\n\nKeep the message brief but still informative about what changed.';
        }
        else if (verbosity === 'detailed') {
            basePrompt += '\n\nProvide comprehensive details about the changes and their impact.';
        }
        basePrompt += '\n\nCommit message:';
        return basePrompt;
    }
    analyzeChanges(changes) {
        const analysis = [];
        // Count change types
        const added = changes.files.filter(f => f.status === 'A').length;
        const modified = changes.files.filter(f => f.status === 'M').length;
        const deleted = changes.files.filter(f => f.status === 'D').length;
        if (added > 0)
            analysis.push(`${added} file(s) added`);
        if (modified > 0)
            analysis.push(`${modified} file(s) modified`);
        if (deleted > 0)
            analysis.push(`${deleted} file(s) deleted`);
        // Identify patterns in changes
        const filePatterns = this.identifyFilePatterns(changes.files);
        if (filePatterns.length > 0) {
            analysis.push(`Patterns detected: ${filePatterns.join(', ')}`);
        }
        // Calculate change magnitude
        const totalAdditions = changes.files.reduce((sum, f) => sum + f.additions, 0);
        const totalDeletions = changes.files.reduce((sum, f) => sum + f.deletions, 0);
        analysis.push(`Total: +${totalAdditions} -${totalDeletions} lines`);
        return analysis.join('; ');
    }
    identifyFilePatterns(files) {
        const patterns = [];
        // Check for documentation changes
        const docFiles = files.filter(f => f.file.endsWith('.md'));
        if (docFiles.length > 0) {
            patterns.push(`${docFiles.length} documentation file(s)`);
        }
        // Check for test changes
        const testFiles = files.filter(f => f.file.includes('.test.') || f.file.includes('.spec.'));
        if (testFiles.length > 0) {
            patterns.push(`${testFiles.length} test file(s)`);
        }
        // Check for config changes
        const configFiles = files.filter(f => f.file.includes('config') || f.file.includes('.json') || f.file.includes('.yaml'));
        if (configFiles.length > 0) {
            patterns.push(`${configFiles.length} config file(s)`);
        }
        // Check for component/UI changes
        const componentFiles = files.filter(f => f.file.includes('component') || f.file.includes('/ui/') || f.file.endsWith('.tsx'));
        if (componentFiles.length > 0) {
            patterns.push(`${componentFiles.length} component file(s)`);
        }
        // Check for API/route changes
        const apiFiles = files.filter(f => f.file.includes('/api/') || f.file.includes('route'));
        if (apiFiles.length > 0) {
            patterns.push(`${apiFiles.length} API file(s)`);
        }
        return patterns;
    }
    parseAIResponse(text, changes) {
        const suggestions = [];
        // Extract commit message from AI response
        // The AI might include explanatory text, so we need to find the actual commit message
        const lines = text.split('\n');
        // Find where the actual AI response ends and prompt echo/instructions begin
        // Look for markers that indicate we've entered meta-commentary
        const stopMarkers = [
            'Generate a conventional commit',
            'IMPORTANT:',
            'Good example format:',
            'Bad example (DO NOT DO THIS):',
            'First line: type(scope):',
            'Format: type(scope):',
            'Commit message:',
            'Body (required for multi-file changes):',
            'Focus on the MEANING and PURPOSE'
        ];
        let stopAtLine = lines.length;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (stopMarkers.some(marker => line.includes(marker))) {
                stopAtLine = i;
                break;
            }
        }
        // Only process lines before the stop marker
        const relevantLines = lines.slice(0, stopAtLine);
        // Find lines that look like commit messages
        let currentSuggestion = null;
        let bodyLines = [];
        let foundFirstSuggestion = false;
        for (let i = 0; i < relevantLines.length; i++) {
            const line = relevantLines[i].trim();
            // Skip empty lines
            if (!line)
                continue;
            // Check if this is a commit message header
            const match = line.match(/^(feat|fix|refactor|docs|style|test|chore|perf|ci|build)(\(([^)]+)\))?(!)?:\s*(.+)$/i);
            if (match) {
                const [, type, , scope, breaking, subject] = match;
                const subjectText = subject.trim();
                // Filter out lines that look like instructions or generic placeholders
                const isMetaCommentary = subjectText.includes('type(scope)') ||
                    subjectText.includes('brief description') ||
                    subjectText.includes('what was accomplished') ||
                    line.toLowerCase().includes('description:') ||
                    subjectText === 'improvements' || // Too generic alone
                    subjectText === 'updates'; // Too generic alone
                if (isMetaCommentary) {
                    continue; // Skip this line
                }
                // Save previous suggestion if exists
                if (currentSuggestion && currentSuggestion.type && currentSuggestion.subject) {
                    const body = bodyLines.length > 0 ? bodyLines.join('\n').trim() : undefined;
                    const fullMessage = `${currentSuggestion.type}${currentSuggestion.scope ? `(${currentSuggestion.scope})` : ''}${currentSuggestion.breaking ? '!' : ''}: ${currentSuggestion.subject}${body ? '\n\n' + body : ''}`;
                    suggestions.push({
                        type: currentSuggestion.type,
                        scope: currentSuggestion.scope,
                        subject: currentSuggestion.subject,
                        body,
                        breaking: currentSuggestion.breaking || false,
                        fullMessage,
                        confidence: 0.9,
                    });
                    foundFirstSuggestion = true;
                }
                // Start new suggestion
                currentSuggestion = {
                    type: type.toLowerCase(),
                    scope: scope?.trim(),
                    subject: subjectText,
                    breaking: !!breaking || line.includes('BREAKING CHANGE'),
                };
                bodyLines = [];
            }
            else if (currentSuggestion && line) {
                // This is a body line (bullet point or continuation)
                // Skip lines that look like instructions or meta-commentary
                const isInstruction = line.toLowerCase().includes('commit message') ||
                    line.toLowerCase().includes('example') ||
                    line.toLowerCase().includes('format') ||
                    line.toLowerCase().includes('generate') ||
                    line.includes('Type:') ||
                    line.includes('Scope:') ||
                    line.includes('Description:') ||
                    line.toLowerCase().includes('what specific improvements') ||
                    line.toLowerCase().includes('why these changes') ||
                    line.toLowerCase().includes('key files or components') ||
                    line.toLowerCase().includes('focus on');
                if (!isInstruction) {
                    bodyLines.push(line);
                }
            }
        }
        // Don't forget the last suggestion (if it's valid)
        if (currentSuggestion && currentSuggestion.type && currentSuggestion.subject) {
            const body = bodyLines.length > 0 ? bodyLines.join('\n').trim() : undefined;
            const fullMessage = `${currentSuggestion.type}${currentSuggestion.scope ? `(${currentSuggestion.scope})` : ''}${currentSuggestion.breaking ? '!' : ''}: ${currentSuggestion.subject}${body ? '\n\n' + body : ''}`;
            suggestions.push({
                type: currentSuggestion.type,
                scope: currentSuggestion.scope,
                subject: currentSuggestion.subject,
                body,
                breaking: currentSuggestion.breaking || false,
                fullMessage,
                confidence: 0.9,
            });
        }
        // If no valid suggestions found from AI, return empty array
        // The caller will fall back to heuristic suggestions
        return suggestions.slice(0, 2); // Return up to 2 suggestions (reduced from 3 to avoid prompt leakage)
    }
    generateFallbackSuggestions(changes) {
        // Analyze the changes intelligently with deep diff analysis
        const analysis = this.analyzeChangesForFallback(changes);
        const diffAnalysis = this.analyzeDiffsInDepth(changes);
        const subject = this.generateSmartSubject(changes, analysis, diffAnalysis);
        const body = this.generateSmartBody(changes, analysis, diffAnalysis);
        const scope = this.generateSmartScope(changes, analysis);
        const fullMessage = `${analysis.type}${scope ? `(${scope})` : ''}: ${subject}${body ? '\n\n' + body : ''}`;
        return [{
                type: analysis.type,
                scope,
                subject,
                body,
                breaking: false,
                fullMessage,
                confidence: 0.85
            }];
    }
    analyzeDiffsInDepth(changes) {
        const newFunctions = [];
        const newClasses = [];
        const newComponents = [];
        const newImports = [];
        const modifiedFunctions = [];
        const configChanges = [];
        const uiChanges = [];
        const apiChanges = [];
        changes.files.forEach(file => {
            const lines = file.diff.split('\n');
            lines.forEach((line, idx) => {
                if (!line.startsWith('+'))
                    return;
                const content = line.substring(1).trim();
                // Detect new functions
                if (content.match(/^(export\s+)?(async\s+)?function\s+(\w+)/)) {
                    const match = content.match(/function\s+(\w+)/);
                    if (match)
                        newFunctions.push(match[1]);
                }
                // Detect new arrow functions (const functionName = )
                if (content.match(/^(export\s+)?const\s+(\w+)\s*=\s*(\(.*\)|async)/)) {
                    const match = content.match(/const\s+(\w+)/);
                    if (match)
                        newFunctions.push(match[1]);
                }
                // Detect new classes
                if (content.match(/^(export\s+)?class\s+(\w+)/)) {
                    const match = content.match(/class\s+(\w+)/);
                    if (match)
                        newClasses.push(match[1]);
                }
                // Detect new React components (function/const with JSX return)
                if (file.file.match(/\.(tsx|jsx)$/) && content.match(/^(export\s+)?(const|function)\s+([A-Z]\w+)/)) {
                    const match = content.match(/(?:const|function)\s+([A-Z]\w+)/);
                    if (match)
                        newComponents.push(match[1]);
                }
                // Detect new imports
                if (content.match(/^import\s+.*from/)) {
                    const match = content.match(/from\s+['"](.+)['"]/);
                    if (match) {
                        const pkg = match[1].split('/')[0];
                        if (!pkg.startsWith('.'))
                            newImports.push(pkg);
                    }
                }
                // Detect config changes
                if (file.file.match(/config|\.json$|\.yaml$|\.env/)) {
                    const match = content.match(/['"'](\w+)['"']\s*:/);
                    if (match)
                        configChanges.push(match[1]);
                }
                // Detect UI changes (JSX elements)
                if (file.file.match(/\.(tsx|jsx)$/) && content.match(/<([A-Z]\w+)/)) {
                    const match = content.match(/<([A-Z]\w+)/);
                    if (match)
                        uiChanges.push(match[1]);
                }
                // Detect API changes
                if (file.file.match(/route\.|api\//)) {
                    if (content.match(/\.(get|post|put|patch|delete)\(/i)) {
                        const match = content.match(/\.(get|post|put|patch|delete)\(/i);
                        if (match)
                            apiChanges.push(match[1].toUpperCase());
                    }
                }
            });
        });
        // Determine main purpose based on what was found
        let mainPurpose = '';
        if (newComponents.length > 3) {
            mainPurpose = `implementing ${newComponents.length} new UI components`;
        }
        else if (newComponents.length > 0) {
            mainPurpose = `adding ${newComponents.slice(0, 3).join(', ')} component${newComponents.length > 1 ? 's' : ''}`;
        }
        else if (newFunctions.length > 5) {
            mainPurpose = `implementing multiple utility functions and helpers`;
        }
        else if (newFunctions.length > 0) {
            mainPurpose = `adding ${newFunctions.slice(0, 3).join(', ')} function${newFunctions.length > 1 ? 's' : ''}`;
        }
        else if (newClasses.length > 0) {
            mainPurpose = `implementing ${newClasses.join(', ')} class${newClasses.length > 1 ? 'es' : ''}`;
        }
        else if (apiChanges.length > 0) {
            mainPurpose = `adding ${[...new Set(apiChanges)].join(', ')} API endpoint${apiChanges.length > 1 ? 's' : ''}`;
        }
        else if (uiChanges.length > 5) {
            mainPurpose = `enhancing UI with multiple component updates`;
        }
        else if (configChanges.length > 0) {
            mainPurpose = `updating configuration settings`;
        }
        else if (newImports.length > 0) {
            const uniqueImports = [...new Set(newImports)];
            mainPurpose = `integrating ${uniqueImports.slice(0, 2).join(' and ')} ${uniqueImports.length > 2 ? 'and other ' : ''}dependencies`;
        }
        return {
            newFunctions: [...new Set(newFunctions)].slice(0, 5),
            newClasses: [...new Set(newClasses)].slice(0, 3),
            newComponents: [...new Set(newComponents)].slice(0, 5),
            newImports: [...new Set(newImports)].slice(0, 5),
            modifiedFunctions,
            configChanges: [...new Set(configChanges)].slice(0, 5),
            uiChanges: [...new Set(uiChanges)].slice(0, 10),
            apiChanges: [...new Set(apiChanges)],
            mainPurpose
        };
    }
    analyzeChangesForFallback(changes) {
        let hasTests = false;
        let hasDocs = false;
        let hasConfig = false;
        let hasBuild = false;
        let hasComponents = false;
        let hasAPI = false;
        let hasStyles = false;
        const mainFiles = [];
        changes.files.forEach(file => {
            if (file.file.includes('.test.') || file.file.includes('.spec.')) {
                hasTests = true;
            }
            else if (file.file.endsWith('.md')) {
                hasDocs = true;
                if (file.additions > 10)
                    mainFiles.push(file.file);
            }
            else if (file.file.includes('package.json') || file.file.includes('tsconfig.json') || file.file.includes('.config.')) {
                hasConfig = true;
            }
            else if (file.file.includes('webpack') || file.file.includes('vite') || file.file.includes('build')) {
                hasBuild = true;
            }
            else if (file.file.includes('component') || file.file.endsWith('.tsx') || file.file.endsWith('.jsx')) {
                hasComponents = true;
                if (file.additions + file.deletions > 20)
                    mainFiles.push(file.file);
            }
            else if (file.file.includes('/api/') || file.file.includes('route.') || file.file.includes('controller')) {
                hasAPI = true;
                mainFiles.push(file.file);
            }
            else if (file.file.endsWith('.css') || file.file.endsWith('.scss') || file.file.includes('style')) {
                hasStyles = true;
            }
            else if (file.additions + file.deletions > 30) {
                mainFiles.push(file.file);
            }
        });
        // Determine type and category
        let type;
        let category;
        if (hasTests) {
            type = 'test';
            category = 'testing';
        }
        else if (hasDocs && !hasComponents && !hasAPI) {
            type = 'docs';
            category = 'documentation';
        }
        else if (hasConfig && changes.files.length <= 3) {
            type = 'chore';
            category = 'configuration';
        }
        else if (hasBuild) {
            type = 'build';
            category = 'build';
        }
        else if (hasStyles && !hasComponents && !hasAPI) {
            type = 'style';
            category = 'styling';
        }
        else if (hasAPI) {
            const additions = changes.files.reduce((sum, f) => sum + f.additions, 0);
            type = additions > 50 ? 'feat' : 'fix';
            category = 'API';
        }
        else if (hasComponents) {
            const additions = changes.files.reduce((sum, f) => sum + f.additions, 0);
            type = additions > 50 ? 'feat' : 'fix';
            category = 'components';
        }
        else {
            const additions = changes.files.reduce((sum, f) => sum + f.additions, 0);
            const deletions = changes.files.reduce((sum, f) => sum + f.deletions, 0);
            if (additions > deletions * 2) {
                type = 'feat';
                category = 'features';
            }
            else if (deletions > additions * 2) {
                type = 'refactor';
                category = 'refactoring';
            }
            else {
                type = 'fix';
                category = 'fixes';
            }
        }
        return { type, category, mainFiles };
    }
    generateSmartSubject(changes, analysis, diffAnalysis) {
        // For single file changes, be specific
        if (changes.files.length === 1) {
            const file = changes.files[0];
            const fileName = file.file.split('/').pop()?.replace(/\.(ts|tsx|js|jsx|md)$/, '') || file.file;
            // Use diff analysis if available
            if (diffAnalysis.mainPurpose) {
                return diffAnalysis.mainPurpose;
            }
            if (file.status === 'A') {
                return `add ${fileName}`;
            }
            else if (file.status === 'D') {
                return `remove ${fileName}`;
            }
            else {
                return `update ${fileName}`;
            }
        }
        // For multiple files, use diff analysis for better description
        const fileCount = changes.files.length;
        // If we have a meaningful purpose from diff analysis, use it
        if (diffAnalysis.mainPurpose) {
            return diffAnalysis.mainPurpose;
        }
        // Try to infer what was done based on file patterns
        if (analysis.category === 'documentation') {
            return `update documentation (${fileCount} files)`;
        }
        else if (analysis.category === 'testing') {
            return `update tests (${fileCount} files)`;
        }
        else if (analysis.category === 'configuration') {
            return `update configuration files`;
        }
        else if (analysis.category === 'API') {
            return `update API endpoints and handlers`;
        }
        else if (analysis.category === 'components') {
            return `update UI components (${fileCount} files)`;
        }
        else if (analysis.category === 'styling') {
            return `update styles and formatting`;
        }
        else {
            // Generic fallback
            const additions = changes.files.reduce((sum, f) => sum + f.additions, 0);
            const deletions = changes.files.reduce((sum, f) => sum + f.deletions, 0);
            if (additions > deletions * 2) {
                return `add new functionality (${fileCount} files)`;
            }
            else if (deletions > additions * 2) {
                return `refactor and cleanup (${fileCount} files)`;
            }
            else {
                return `update multiple files (${fileCount} changes)`;
            }
        }
    }
    generateSmartBody(changes, analysis, diffAnalysis) {
        if (changes.files.length <= 1) {
            return undefined; // No body needed for single file
        }
        const bullets = [];
        // Generate meaningful bullets based on what was actually changed
        // 1. Describe new components/classes/functions
        if (diffAnalysis.newComponents.length > 0) {
            const components = diffAnalysis.newComponents.slice(0, 3).join(', ');
            const more = diffAnalysis.newComponents.length > 3 ? ` and ${diffAnalysis.newComponents.length - 3} more` : '';
            bullets.push(`- Implemented new components: ${components}${more}`);
        }
        if (diffAnalysis.newClasses.length > 0) {
            bullets.push(`- Added ${diffAnalysis.newClasses.join(', ')} class${diffAnalysis.newClasses.length > 1 ? 'es' : ''} for improved architecture`);
        }
        if (diffAnalysis.newFunctions.length > 0 && diffAnalysis.newComponents.length === 0) {
            const funcs = diffAnalysis.newFunctions.slice(0, 3).join(', ');
            const more = diffAnalysis.newFunctions.length > 3 ? ` and ${diffAnalysis.newFunctions.length - 3} more utilities` : '';
            bullets.push(`- Implemented helper functions: ${funcs}${more}`);
        }
        // 2. Describe new dependencies
        if (diffAnalysis.newImports.length > 0) {
            const imports = diffAnalysis.newImports.slice(0, 3).join(', ');
            const more = diffAnalysis.newImports.length > 3 ? ` and ${diffAnalysis.newImports.length - 3} others` : '';
            bullets.push(`- Integrated new dependencies: ${imports}${more}`);
        }
        // 3. Describe configuration changes
        if (diffAnalysis.configChanges.length > 0) {
            bullets.push(`- Updated configuration settings for ${diffAnalysis.configChanges.slice(0, 3).join(', ')}`);
        }
        // 4. Describe API changes
        if (diffAnalysis.apiChanges.length > 0) {
            bullets.push(`- Added ${diffAnalysis.apiChanges.join(', ')} API endpoint${diffAnalysis.apiChanges.length > 1 ? 's' : ''}`);
        }
        // 5. Describe UI enhancements
        if (diffAnalysis.uiChanges.length > 5 && diffAnalysis.newComponents.length === 0) {
            bullets.push(`- Enhanced UI with ${diffAnalysis.uiChanges.length} component updates`);
        }
        // 6. Add file statistics if we have meaningful changes
        const added = changes.files.filter(f => f.status === 'A');
        const modified = changes.files.filter(f => f.status === 'M');
        const deleted = changes.files.filter(f => f.status === 'D');
        // Only mention file stats if they add context
        if (bullets.length === 0) {
            // No specific changes detected, fall back to file-based description
            if (added.length > 0) {
                if (added.length <= 3) {
                    bullets.push(`- Added: ${added.map(f => f.file.split('/').pop()).join(', ')}`);
                }
                else {
                    bullets.push(`- Added ${added.length} new files`);
                }
            }
            if (modified.length > 0) {
                if (modified.length <= 3) {
                    bullets.push(`- Modified: ${modified.map(f => f.file.split('/').pop()).join(', ')}`);
                }
                else {
                    bullets.push(`- Modified ${modified.length} existing files`);
                }
            }
            if (deleted.length > 0) {
                if (deleted.length <= 3) {
                    bullets.push(`- Removed: ${deleted.map(f => f.file.split('/').pop()).join(', ')}`);
                }
                else {
                    bullets.push(`- Removed ${deleted.length} files`);
                }
            }
        }
        else {
            // We have specific changes, just add a summary line
            const fileParts = [];
            if (added.length > 0)
                fileParts.push(`${added.length} added`);
            if (modified.length > 0)
                fileParts.push(`${modified.length} modified`);
            if (deleted.length > 0)
                fileParts.push(`${deleted.length} deleted`);
            if (fileParts.length > 0) {
                bullets.push(`- Files: ${fileParts.join(', ')}`);
            }
        }
        // Always add total changes
        const totalAdditions = changes.files.reduce((sum, f) => sum + f.additions, 0);
        const totalDeletions = changes.files.reduce((sum, f) => sum + f.deletions, 0);
        bullets.push(`- Total: +${totalAdditions} -${totalDeletions} lines`);
        // Add a "why this matters" line based on category
        const whyItMatters = this.generateWhyItMatters(analysis.category, diffAnalysis);
        if (whyItMatters) {
            bullets.push(`\n   ${whyItMatters}`);
        }
        return bullets.length > 0 ? bullets.join('\n') : undefined;
    }
    generateWhyItMatters(category, diffAnalysis) {
        if (category === 'components' || diffAnalysis.newComponents.length > 0) {
            return 'Type: feat | Confidence: 85%';
        }
        else if (category === 'API' || diffAnalysis.apiChanges.length > 0) {
            return 'Type: feat | Confidence: 90%';
        }
        else if (category === 'testing') {
            return 'Type: test | Confidence: 95%';
        }
        else if (category === 'documentation') {
            return 'Type: docs | Confidence: 95%';
        }
        else if (category === 'configuration') {
            return 'Type: chore | Confidence: 90%';
        }
        else if (diffAnalysis.newClasses.length > 0 || diffAnalysis.newFunctions.length > 0) {
            return 'Type: feat | Confidence: 85%';
        }
        return '';
    }
    generateSmartScope(changes, analysis) {
        // Try to find common directory
        const directories = changes.files
            .map(f => f.file.split('/'))
            .filter(parts => parts.length > 1)
            .map(parts => parts[parts.length - 2]); // Get parent directory
        const commonDir = this.findMostCommon(directories);
        if (commonDir && commonDir.length > 1 && commonDir !== 'src') {
            return commonDir;
        }
        // Use category-based scope
        if (analysis.category === 'API')
            return 'api';
        if (analysis.category === 'components')
            return 'ui';
        if (analysis.category === 'testing')
            return 'tests';
        return undefined;
    }
    findMostCommon(strings) {
        const counts = {};
        for (const str of strings) {
            counts[str] = (counts[str] || 0) + 1;
        }
        let maxCount = 0;
        let mostCommon = '';
        for (const str in counts) {
            if (counts[str] > maxCount) {
                maxCount = counts[str];
                mostCommon = str;
            }
        }
        return mostCommon || undefined;
    }
}
exports.AICommitAssistant = AICommitAssistant;
//# sourceMappingURL=ai-assistant.js.map