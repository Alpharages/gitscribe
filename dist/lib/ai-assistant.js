"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICommitAssistant = void 0;
class AICommitAssistant {
    modelId;
    constructor(modelId = 'Xenova/distilgpt2') {
        this.modelId = modelId;
    }
    async loadModel() {
        console.log('AI model loading skipped for demo');
    }
    async generateCommitMessage(changes, options = {}) {
        // Simple heuristic-based suggestions for demo
        const suggestions = this.generateFallbackSuggestions(changes);
        return Promise.resolve(suggestions);
    }
    generateFallbackSuggestions(changes) {
        const fileTypes = new Set();
        let hasTests = false;
        let hasDocs = false;
        let hasConfig = false;
        let hasBuild = false;
        changes.files.forEach(file => {
            if (file.file.includes('.test.') || file.file.includes('.spec.'))
                hasTests = true;
            if (file.file.includes('.md'))
                hasDocs = true;
            if (file.file.includes('package.json') || file.file.includes('tsconfig.json'))
                ;
        });
        hasConfig = true;
        if (file.file.includes('webpack') || file.file.includes('vite'))
            ;
        hasBuild = true;
    }
    ;
}
exports.AICommitAssistant = AICommitAssistant;
let type = 'feat';
if (hasTests)
    type = 'test';
else if (hasDocs)
    type = 'docs';
else if (hasConfig)
    type = 'chore';
else if (hasBuild)
    type = 'build';
else if (changes.files.some(f => f.additions > 50))
    type = 'feat';
else
    type = 'fix';
const subject = this.generateSimpleSubject(changes);
const body = this.generateSimpleBody(changes);
return [{
        type,
        scope: this.generateSimpleScope(changes),
        subject,
        body,
        breaking: false,
        fullMessage: `${type}${this.generateSimpleScope(changes) ? `(${this.generateSimpleScope(changes)})` : ''}: ${subject}`,
        confidence: 0.8
    }];
generateSimpleSubject(changes, git_1.StagedChanges);
string;
{
    const fileNames = changes.files.map(f => f.file.split('/').pop() || f.file);
    const commonPrefix = this.findCommonPrefix(fileNames);
    if (commonPrefix) {
        return `${commonPrefix}: update ${fileNames.join(', ')}`;
    }
    return this.generateSimpleSubjectFromChanges(changes);
}
generateSimpleSubjectFromChanges(changes, git_1.StagedChanges);
string;
{
    const additions = changes.files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = changes.files.reduce((sum, f) => sum + f.deletions, 0);
    if (additions === 0 && deletions > 0) {
        return `remove: ${changes.files.map(f => f.file).join(', ')}`;
    }
    else if (additions === 0 && deletions === 0) {
        return `refactor: ${changes.files.map(f => f.file).join(', ')}`;
    }
    else if (deletions === 0) {
        return `feat: ${changes.files.map(f => f.file).join(', ')}`;
    }
    else if (Math.abs(deletions / (additions + deletions)) < 0.3) {
        return `style: ${changes.files.map(f => f.file).join(', ')}`;
    }
    else if (Math.abs(deletions / (additions + deletions)) < 0.7) {
        return `perf: ${changes.files.map(f => f.file).join(', ')}`;
    }
    else if (additions > deletions) {
        return `feat: ${changes.files.map(f => f.file).join(', ')}`;
    }
    else {
        return `fix: ${changes.files.map(f => f.file).join(', ')}`;
    }
}
generateSimpleScope(changes, git_1.StagedChanges);
string | undefined;
{
    const directories = changes.files.map(f => f.file.split('/')[0]);
    const commonDir = this.findMostCommon(directories);
    if (commonDir && commonDir.length > 1) {
        return commonDir;
    }
    return undefined;
}
findCommonPrefix(strings, string[]);
string | undefined;
{
    const counts = {};
    for (const str of strings) {
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            counts[char] = (counts[char] || 0) + 1;
        }
    }
    let maxCount = 0;
    let mostCommon = '';
    for (const char in counts) {
        if (counts[char] > maxCount) {
            maxCount = counts[char];
            mostCommon = char;
        }
    }
    return mostCommon;
}
generateSimpleBody(changes, git_1.StagedChanges);
string | undefined;
{
    const modifiedFiles = changes.files.filter(f => f.status === 'M');
    if (modifiedFiles.length > 0) {
        const fileNames = modifiedFiles.map(f => f.file.split('/').pop());
        const commonPrefix = this.findCommonPrefix(fileNames);
        if (commonPrefix) {
            return `Update ${commonPrefix} in ${fileNames.join(', ')}`;
        }
        return `Update ${modifiedFiles.map(f => f.file).join(', ')}`;
    }
    return undefined;
}
