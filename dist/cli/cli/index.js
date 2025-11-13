#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const git_1 = require("../lib/git");
const ai_assistant_1 = require("../lib/ai-assistant");
const fs_1 = require("fs");
const path_1 = require("path");
const CONFIG_FILE = (0, path_1.join)(process.cwd(), '.ai-commit.json');
const CACHE_FILE = (0, path_1.join)(process.cwd(), '.ai-commit-cache.json');
class CLI {
    gitService;
    aiAssistant;
    config;
    constructor() {
        this.gitService = new git_1.GitService();
        this.config = this.loadConfig();
        // Pass configured model to AI assistant (supports config file and env var)
        this.aiAssistant = new ai_assistant_1.AICommitAssistant(this.config.model);
    }
    loadConfig() {
        if ((0, fs_1.existsSync)(CONFIG_FILE)) {
            try {
                return JSON.parse((0, fs_1.readFileSync)(CONFIG_FILE, 'utf-8'));
            }
            catch (error) {
                console.warn(chalk_1.default.yellow('Warning: Failed to load config file'));
            }
        }
        return {};
    }
    saveConfig() {
        try {
            (0, fs_1.writeFileSync)(CONFIG_FILE, JSON.stringify(this.config, null, 2));
            console.log(chalk_1.default.green('Configuration saved'));
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to save configuration:', error));
        }
    }
    loadCache() {
        if ((0, fs_1.existsSync)(CACHE_FILE)) {
            try {
                const cache = JSON.parse((0, fs_1.readFileSync)(CACHE_FILE, 'utf-8'));
                // Cache expires after 5 minutes
                const now = Date.now();
                if (now - cache.timestamp < 5 * 60 * 1000) {
                    return cache;
                }
            }
            catch (error) {
                // Ignore cache errors
            }
        }
        return null;
    }
    saveCache(suggestions, changesSummary) {
        try {
            const cache = {
                suggestions,
                changesSummary,
                timestamp: Date.now()
            };
            (0, fs_1.writeFileSync)(CACHE_FILE, JSON.stringify(cache, null, 2));
        }
        catch (error) {
            // Silently fail cache save
        }
    }
    clearCache() {
        try {
            if ((0, fs_1.existsSync)(CACHE_FILE)) {
                (0, fs_1.writeFileSync)(CACHE_FILE, JSON.stringify({ suggestions: [], changesSummary: '', timestamp: 0 }));
            }
        }
        catch (error) {
            // Silently fail
        }
    }
    async review(options) {
        try {
            console.log(chalk_1.default.blue('🔍 Analyzing staged changes...'));
            if (!(await this.gitService.isGitRepository())) {
                console.error(chalk_1.default.red('Error: Not a Git repository'));
                process.exit(1);
            }
            const changes = await this.gitService.getStagedChanges();
            if (!changes.hasChanges) {
                console.log(chalk_1.default.yellow('⚠️  No staged changes found'));
                console.log(chalk_1.default.gray('Stage some changes first using: git add <files>'));
                return;
            }
            console.log(chalk_1.default.green(`✓ Found changes: ${changes.summary}`));
            console.log();
            changes.files.forEach(file => {
                console.log(chalk_1.default.cyan(`📄 ${file.file}`));
                console.log(chalk_1.default.gray(`   Status: ${file.status} | +${file.additions} -${file.deletions}`));
            });
            console.log();
            console.log(chalk_1.default.blue('🧠 Generating commit message suggestions...'));
            const aiOptions = {
                maxTokens: options.maxTokens || this.config.maxTokens,
                temperature: options.temperature || this.config.temperature,
                verbosity: options.verbosity || this.config.verbosity || 'balanced',
                includeBody: options.includeBody || this.config.includeBody,
                customPrompt: this.config.customPrompt
            };
            const suggestions = await this.aiAssistant.generateCommitMessage(changes, aiOptions);
            // Cache suggestions for commit command (expires in 5 minutes)
            this.saveCache(suggestions, changes.summary);
            console.log();
            console.log(chalk_1.default.green('📝 Commit Message Suggestions:'));
            console.log();
            suggestions.forEach((suggestion, index) => {
                console.log(chalk_1.default.bold(`${index + 1}. ${suggestion.fullMessage}`));
                console.log(chalk_1.default.gray(`   Type: ${suggestion.type}${suggestion.scope ? `(${suggestion.scope})` : ''} | Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`));
                if (suggestion.breaking) {
                    console.log(chalk_1.default.red('   ⚠️  BREAKING CHANGE'));
                }
                console.log();
            });
            if (options.interactive) {
                const selected = await this.selectSuggestion(suggestions);
                if (selected) {
                    await this.gitService.commit(selected.fullMessage);
                    console.log(chalk_1.default.green('✅ Commit created successfully!'));
                }
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:', error));
            process.exit(1);
        }
    }
    async commit(options) {
        try {
            console.log(chalk_1.default.blue('🤖 Auto-committing with AI-generated message...'));
            if (!(await this.gitService.isGitRepository())) {
                console.error(chalk_1.default.red('Error: Not a Git repository'));
                process.exit(1);
            }
            const changes = await this.gitService.getStagedChanges();
            if (!changes.hasChanges) {
                console.log(chalk_1.default.yellow('⚠️  No staged changes found'));
                console.log(chalk_1.default.gray('Stage some changes first using: git add <files>'));
                return;
            }
            // Check if we have cached suggestions from a recent review
            let suggestions;
            const cache = this.loadCache();
            if (cache && cache.changesSummary === changes.summary && cache.suggestions.length > 0) {
                // Use cached suggestions from last review (within 5 minutes)
                console.log(chalk_1.default.gray('💾 Using suggestions from recent review...'));
                suggestions = cache.suggestions;
            }
            else {
                // Generate new suggestions
                console.log(chalk_1.default.gray('🔄 Changes detected or cache expired, generating new suggestions...'));
                const aiOptions = {
                    maxTokens: options.maxTokens || this.config.maxTokens,
                    temperature: options.temperature || this.config.temperature,
                    verbosity: options.verbosity || this.config.verbosity || 'balanced',
                    includeBody: options.includeBody || this.config.includeBody,
                    customPrompt: this.config.customPrompt
                };
                suggestions = await this.aiAssistant.generateCommitMessage(changes, aiOptions);
                // Save new suggestions to cache
                this.saveCache(suggestions, changes.summary);
            }
            const bestSuggestion = suggestions.reduce((best, current) => current.confidence > best.confidence ? current : best);
            console.log(chalk_1.default.green(`📝 Generated message: ${bestSuggestion.fullMessage}`));
            if (!options.noConfirm) {
                console.log(chalk_1.default.yellow('Proceed with commit? (y/N)'));
                process.stdin.setRawMode(true);
                process.stdin.resume();
                const answer = await new Promise((resolve) => {
                    process.stdin.once('data', (data) => {
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        resolve(data.toString().toLowerCase().trim());
                    });
                });
                if (answer !== 'y' && answer !== 'yes') {
                    console.log(chalk_1.default.gray('Commit cancelled'));
                    return;
                }
            }
            await this.gitService.commit(bestSuggestion.fullMessage);
            console.log(chalk_1.default.green('✅ Commit created successfully!'));
            // Clear cache after successful commit
            this.clearCache();
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:', error));
            process.exit(1);
        }
    }
    async configure(key, value) {
        if (!key) {
            console.log(chalk_1.default.blue('Current configuration:'));
            console.log(JSON.stringify(this.config, null, 2));
            return;
        }
        if (!value) {
            console.log(chalk_1.default.blue(`${key}: ${this.config[key] || 'not set'}`));
            return;
        }
        let parsedValue = value;
        if (value === 'true')
            parsedValue = true;
        else if (value === 'false')
            parsedValue = false;
        else if (!isNaN(Number(value)))
            parsedValue = Number(value);
        this.config[key] = parsedValue;
        this.saveConfig();
    }
    async status() {
        try {
            if (!(await this.gitService.isGitRepository())) {
                console.error(chalk_1.default.red('Error: Not a Git repository'));
                process.exit(1);
            }
            const branch = await this.gitService.getCurrentBranch();
            const changes = await this.gitService.getStagedChanges();
            const recentCommits = await this.gitService.getRecentCommits(3);
            console.log(chalk_1.default.blue('📊 Repository Status'));
            console.log(chalk_1.default.gray('─'.repeat(30)));
            console.log(`Branch: ${chalk_1.default.cyan(branch)}`);
            console.log(`Staged changes: ${changes.hasChanges ? chalk_1.default.green(changes.summary) : chalk_1.default.yellow('None')}`);
            if (changes.hasChanges) {
                console.log();
                console.log(chalk_1.default.blue('Staged files:'));
                changes.files.forEach(file => {
                    console.log(`  ${chalk_1.default.cyan(file.file)} (${file.status})`);
                });
            }
            console.log();
            console.log(chalk_1.default.blue('Recent commits:'));
            recentCommits.forEach((commit, index) => {
                console.log(`  ${chalk_1.default.gray(index + 1 + '.')} ${commit}`);
            });
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:', error));
            process.exit(1);
        }
    }
    async selectSuggestion(suggestions) {
        console.log(chalk_1.default.blue('Select a suggestion (1-' + suggestions.length + '):'));
        const answer = await new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < suggestions.length) {
            return suggestions[index];
        }
        console.log(chalk_1.default.red('Invalid selection'));
        return null;
    }
}
const program = new commander_1.Command();
const cli = new CLI();
program
    .name('ai-commit')
    .description('AI-powered Git commit assistant')
    .version('1.0.0');
program
    .command('review')
    .description('Review staged changes and get commit message suggestions')
    .option('-i, --interactive', 'Interactively select and commit a suggestion')
    .option('-t, --temperature <number>', 'AI temperature (0.0-1.0)')
    .option('-m, --max-tokens <number>', 'Maximum tokens to generate')
    .option('-v, --verbosity <level>', 'Verbosity level (concise|detailed|balanced)')
    .option('-b, --include-body', 'Include commit body in suggestions')
    .action((options) => cli.review(options));
program
    .command('commit')
    .description('Auto-commit with the best AI-generated message')
    .option('-t, --temperature <number>', 'AI temperature (0.0-1.0)')
    .option('-m, --max-tokens <number>', 'Maximum tokens to generate')
    .option('-v, --verbosity <level>', 'Verbosity level (concise|detailed|balanced)')
    .option('-b, --include-body', 'Include commit body')
    .option('--no-confirm', 'Skip confirmation prompt')
    .action((options) => cli.commit(options));
program
    .command('config')
    .description('Configure AI commit settings')
    .argument('[key]', 'Configuration key')
    .argument('[value]', 'Configuration value')
    .action((key, value) => cli.configure(key, value));
program
    .command('status')
    .description('Show repository status and recent commits')
    .action(() => cli.status());
program.parse();
//# sourceMappingURL=index.js.map