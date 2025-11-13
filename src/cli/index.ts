#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { GitService } from '../lib/git';
import { AICommitAssistant, AIProcessingOptions } from '../lib/ai-assistant';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Config {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  verbosity?: 'concise' | 'detailed' | 'balanced';
  includeBody?: boolean;
  customPrompt?: string;
}

const CONFIG_FILE = join(process.cwd(), '.ai-commit.json');
const CACHE_FILE = join(process.cwd(), '.ai-commit-cache.json');

interface SuggestionCache {
  suggestions: any[];
  changesSummary: string;
  timestamp: number;
}

class CLI {
  private gitService: GitService;
  private aiAssistant: AICommitAssistant;
  private config: Config;

  constructor() {
    this.gitService = new GitService();
    this.config = this.loadConfig();
    // Pass configured model to AI assistant (supports config file and env var)
    this.aiAssistant = new AICommitAssistant(this.config.model);
  }

  private loadConfig(): Config {
    if (existsSync(CONFIG_FILE)) {
      try {
        return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      } catch (error) {
        console.warn(chalk.yellow('Warning: Failed to load config file'));
      }
    }
    return {};
  }

  private saveConfig(): void {
    try {
      writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      console.log(chalk.green('Configuration saved'));
    } catch (error) {
      console.error(chalk.red('Failed to save configuration:', error));
    }
  }

  private loadCache(): SuggestionCache | null {
    if (existsSync(CACHE_FILE)) {
      try {
        const cache: SuggestionCache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
        // Cache expires after 5 minutes
        const now = Date.now();
        if (now - cache.timestamp < 5 * 60 * 1000) {
          return cache;
        }
      } catch (error) {
        // Ignore cache errors
      }
    }
    return null;
  }

  private saveCache(suggestions: any[], changesSummary: string): void {
    try {
      const cache: SuggestionCache = {
        suggestions,
        changesSummary,
        timestamp: Date.now()
      };
      writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
      // Silently fail cache save
    }
  }

  private clearCache(): void {
    try {
      if (existsSync(CACHE_FILE)) {
        writeFileSync(CACHE_FILE, JSON.stringify({ suggestions: [], changesSummary: '', timestamp: 0 }));
      }
    } catch (error) {
      // Silently fail
    }
  }

  async review(options: any): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Analyzing staged changes...'));
      
      if (!(await this.gitService.isGitRepository())) {
        console.error(chalk.red('Error: Not a Git repository'));
        process.exit(1);
      }

      const changes = await this.gitService.getStagedChanges();
      
      if (!changes.hasChanges) {
        console.log(chalk.yellow('⚠️  No staged changes found'));
        console.log(chalk.gray('Stage some changes first using: git add <files>'));
        return;
      }

      console.log(chalk.green(`✓ Found changes: ${changes.summary}`));
      console.log();

      changes.files.forEach(file => {
        console.log(chalk.cyan(`📄 ${file.file}`));
        console.log(chalk.gray(`   Status: ${file.status} | +${file.additions} -${file.deletions}`));
      });

      console.log();
      console.log(chalk.blue('🧠 Generating commit message suggestions...'));

      const aiOptions: AIProcessingOptions = {
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
      console.log(chalk.green('📝 Commit Message Suggestions:'));
      console.log();

      suggestions.forEach((suggestion, index) => {
        console.log(chalk.bold(`${index + 1}. ${suggestion.fullMessage}`));
        console.log(chalk.gray(`   Type: ${suggestion.type}${suggestion.scope ? `(${suggestion.scope})` : ''} | Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`));
        
        if (suggestion.breaking) {
          console.log(chalk.red('   ⚠️  BREAKING CHANGE'));
        }
        
        console.log();
      });

      if (options.interactive) {
        const selected = await this.selectSuggestion(suggestions);
        if (selected) {
          await this.gitService.commit(selected.fullMessage);
          console.log(chalk.green('✅ Commit created successfully!'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error:', error));
      process.exit(1);
    }
  }

  async commit(options: any): Promise<void> {
    try {
      console.log(chalk.blue('🤖 Auto-committing with AI-generated message...'));
      
      if (!(await this.gitService.isGitRepository())) {
        console.error(chalk.red('Error: Not a Git repository'));
        process.exit(1);
      }

      const changes = await this.gitService.getStagedChanges();
      
      if (!changes.hasChanges) {
        console.log(chalk.yellow('⚠️  No staged changes found'));
        console.log(chalk.gray('Stage some changes first using: git add <files>'));
        return;
      }

      // Check if we have cached suggestions from a recent review
      let suggestions;
      const cache = this.loadCache();
      
      if (cache && cache.changesSummary === changes.summary && cache.suggestions.length > 0) {
        // Use cached suggestions from last review (within 5 minutes)
        console.log(chalk.gray('💾 Using suggestions from recent review...'));
        suggestions = cache.suggestions;
      } else {
        // Generate new suggestions
        console.log(chalk.gray('🔄 Changes detected or cache expired, generating new suggestions...'));
        const aiOptions: AIProcessingOptions = {
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
      
      const bestSuggestion = suggestions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      console.log(chalk.green(`📝 Generated message: ${bestSuggestion.fullMessage}`));
      
      if (!options.noConfirm) {
        console.log(chalk.yellow('Proceed with commit? (y/N)'));
        process.stdin.setRawMode(true);
        process.stdin.resume();
        
        const answer = await new Promise<string>((resolve) => {
          process.stdin.once('data', (data) => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve(data.toString().toLowerCase().trim());
          });
        });

        if (answer !== 'y' && answer !== 'yes') {
          console.log(chalk.gray('Commit cancelled'));
          return;
        }
      }

      await this.gitService.commit(bestSuggestion.fullMessage);
      console.log(chalk.green('✅ Commit created successfully!'));
      
      // Clear cache after successful commit
      this.clearCache();

    } catch (error) {
      console.error(chalk.red('Error:', error));
      process.exit(1);
    }
  }

  async configure(key: string, value?: string): Promise<void> {
    if (!key) {
      console.log(chalk.blue('Current configuration:'));
      console.log(JSON.stringify(this.config, null, 2));
      return;
    }

    if (!value) {
      console.log(chalk.blue(`${key}: ${this.config[key as keyof Config] || 'not set'}`));
      return;
    }

    let parsedValue: any = value;
    
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    (this.config as any)[key] = parsedValue;
    this.saveConfig();
  }

  async status(): Promise<void> {
    try {
      if (!(await this.gitService.isGitRepository())) {
        console.error(chalk.red('Error: Not a Git repository'));
        process.exit(1);
      }

      const branch = await this.gitService.getCurrentBranch();
      const changes = await this.gitService.getStagedChanges();
      const recentCommits = await this.gitService.getRecentCommits(3);

      console.log(chalk.blue('📊 Repository Status'));
      console.log(chalk.gray('─'.repeat(30)));
      console.log(`Branch: ${chalk.cyan(branch)}`);
      console.log(`Staged changes: ${changes.hasChanges ? chalk.green(changes.summary) : chalk.yellow('None')}`);
      
      if (changes.hasChanges) {
        console.log();
        console.log(chalk.blue('Staged files:'));
        changes.files.forEach(file => {
          console.log(`  ${chalk.cyan(file.file)} (${file.status})`);
        });
      }

      console.log();
      console.log(chalk.blue('Recent commits:'));
      recentCommits.forEach((commit, index) => {
        console.log(`  ${chalk.gray(index + 1 + '.')} ${commit}`);
      });

    } catch (error) {
      console.error(chalk.red('Error:', error));
      process.exit(1);
    }
  }

  private async selectSuggestion(suggestions: any[]): Promise<any> {
    console.log(chalk.blue('Select a suggestion (1-' + suggestions.length + '):'));
    
    const answer = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });

    const index = parseInt(answer) - 1;
    if (index >= 0 && index < suggestions.length) {
      return suggestions[index];
    }
    
    console.log(chalk.red('Invalid selection'));
    return null;
  }
}

const program = new Command();
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