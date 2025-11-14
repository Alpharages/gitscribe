# 🧠 AI Commit Assistant

A local-first developer tool that automatically generates clear, structured, and context-aware Git commit messages using AI running entirely on your machine.

[![npm version](https://img.shields.io/npm/v/@alpharages/ai-commit-assistant.svg)](https://www.npmjs.com/package/@alpharages/ai-commit-assistant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔍 **Smart Change Analysis** - Analyzes actual code changes, not just filenames, to understand what was done and why
- 🧠 **Local LLM Processing** - Uses Llama 3.2 1B locally via Hugging Face Transformers.js — no cloud calls
- 📝 **Meaningful Commit Messages** - Generates descriptive messages with purpose and impact, not file lists
- 🗂️ **Conventional Commit Output** - Produces messages in `feat`, `fix`, `refactor`, `docs`, etc. formats
- ⚙️ **CLI Interface** - Simple commands like `ai-commit review` or `ai-commit commit`
- 🔒 **Data Privacy** - All code and diffs stay local; zero external API calls
- ⚡ **Fast and Offline** - Runs efficiently without internet dependency

## 🚀 Installation

Install globally via npm:

```bash
npm install -g @alpharages/ai-commit-assistant
```

Verify installation:

```bash
ai-commit --version
```

## 📋 Quick Start

### 1. Stage Your Changes

```bash
git add src/components/Button.tsx
```

### 2. Review Commit Suggestions

```bash
ai-commit review
```

Output:
```
🔍 Analyzing staged changes...
✓ Found changes: 1 file(s) changed, 15 insertions(+), 3 deletions(-)

📄 src/components/Button.tsx
   Status: M | +15 -3

🧠 Generating commit message suggestions...

📝 Commit Message Suggestions:

1. feat(ui): enhance button component with hover effects
   Type: feat(ui) | Confidence: 92%

2. refactor(components): improve button styling and animations
   Type: refactor(components) | Confidence: 78%
```

### 3. Commit with Best Suggestion

```bash
ai-commit commit
```

Or auto-commit without confirmation:

```bash
ai-commit commit --no-confirm
```

## 🎯 Commands

| Command | Description | Options |
|---------|-------------|---------|
| `ai-commit review` | Analyze staged changes and get commit suggestions | `-i, --interactive`<br/>`-t, --temperature <number>`<br/>`-m, --max-tokens <number>`<br/>`-v, --verbosity <level>`<br/>`-b, --include-body` |
| `ai-commit commit` | Auto-commit with the best AI-generated message | `--no-confirm`<br/>Same options as `review` |
| `ai-commit status` | Show repository status and recent commits | - |
| `ai-commit config` | Configure AI commit settings | `[key] [value]` |

## ⚙️ Configuration

Configure the tool to match your preferences:

```bash
# Set verbosity level
ai-commit config verbosity concise|detailed|balanced

# Set AI temperature (0.0-1.0)
ai-commit config temperature 0.7

# Set maximum tokens
ai-commit config maxTokens 150

# Include commit body
ai-commit config includeBody true

# Change AI model
ai-commit config model "meta-llama/Llama-3.2-1B-Instruct"
```

The tool creates a `.ai-commit.json` configuration file in your repository root:

```json
{
  "model": "meta-llama/Llama-3.2-1B-Instruct",
  "maxTokens": 150,
  "temperature": 0.7,
  "verbosity": "balanced",
  "includeBody": true,
  "customPrompt": null
}
```

## 🤖 Supported AI Models

### 🏆 Recommended Models

| Model | Size | Speed | Quality | Memory | Best For |
|-------|------|-------|---------|--------|----------|
| **`meta-llama/Llama-3.2-1B-Instruct`** ⭐ | ~1GB | Medium | ⭐⭐⭐⭐⭐ | 2-3GB | **Production** - Best quality |
| **`onnx-community/Qwen2.5-1.5B-Instruct`** | ~1.5GB | Medium | ⭐⭐⭐⭐⭐ | 3GB | **Production** - Excellent reasoning |
| `onnx-community/Qwen2.5-0.5B-Instruct` | ~500MB | Fast | ⭐⭐⭐⭐ | 1-2GB | Compact, fast generation |
| `HuggingFaceTB/SmolLM2-1.7B-Instruct` | ~1.7GB | Medium | ⭐⭐⭐⭐ | 3GB | High quality, efficient |
| `openai-community/gpt2` | ~500MB | Fast | ⭐⭐⭐ | 1GB | Balanced, quick |
| `distilbert/distilgpt2` | ~300MB | Very Fast | ⭐⭐ | 512MB | Testing, low resources |
| `microsoft/phi-2` | ~2.7GB | Slower | ⭐⭐⭐⭐⭐ | 4GB | Best quality |

### Switching Models

```bash
# Best quality (default)
ai-commit config model "meta-llama/Llama-3.2-1B-Instruct"

# Fast alternative
ai-commit config model "onnx-community/Qwen2.5-0.5B-Instruct"

# Highest quality (requires 4GB+ RAM)
ai-commit config model "microsoft/phi-2"
```

## 💡 Examples

### Basic Usage

```bash
# Stage changes
git add src/

# Get AI suggestions
ai-commit review

# Commit with best suggestion
ai-commit commit
```

### Advanced Configuration

```bash
# Configure for detailed commit messages
ai-commit config verbosity detailed
ai-commit config includeBody true

# Generate with custom settings
ai-commit review --temperature 0.9 --max-tokens 200
```

### Interactive Mode

```bash
# Interactive selection and commit
ai-commit review --interactive

# Select a suggestion (1-2): 1
# ✅ Commit created successfully!
```

## 🎨 Commit Message Quality

**Before** (traditional commits):
```
docs(docs): update file1.ts, file2.ts, file3.ts, file4.ts...
```

**After** (AI-generated):
```
fix: cleanup ClickUp integration formatting and improve tool handler readability

- Fixed inconsistent formatting in clickup-story-client.ts and tool-handler.ts
- Improved code readability by reformatting multi-line statements
- Enhanced error handling comments for better debugging clarity
- Added detailed documentation files explaining ClickUp-related fixes
```

## 🔒 Privacy & Security

- ✅ **100% Local Processing** - No data leaves your machine
- ✅ **Offline Capable** - Works without internet connection
- ✅ **No Cloud Dependencies** - Zero external API calls
- ✅ **Code Privacy** - Your source code never gets transmitted
- ✅ **Open Source Models** - Uses transparent, auditable AI models

## 🚀 Performance

- **Model Size**: ~1GB (downloaded once on first use)
- **Generation Time**: 2-5 seconds for typical changes
- **Memory Usage**: ~2GB RAM during processing
- **CPU Usage**: Optimized for modern processors

## 🎨 Conventional Commit Types

The tool automatically detects and uses appropriate commit types:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 login support` |
| `fix` | Bug fix | `fix(api): handle null response in user endpoint` |
| `refactor` | Code refactoring | `refactor(ui): extract button component` |
| `docs` | Documentation | `docs(readme): update installation instructions` |
| `style` | Code style changes | `style(css): fix button alignment issues` |
| `test` | Test additions/changes | `test(auth): add unit tests for login flow` |
| `chore` | Maintenance tasks | `chore(deps): update react to v18` |
| `perf` | Performance improvements | `perf(api): optimize database queries` |
| `ci` | CI/CD changes | `ci(github): add automated testing workflow` |
| `build` | Build system changes | `build(webpack): configure production optimizations` |

## 🏗️ Technology Stack

- **Language**: TypeScript (Node.js)
- **AI Engine**: `@huggingface/transformers` running Llama 3.2 1B Instruct
- **Git Integration**: `simple-git`
- **CLI Framework**: `commander`
- **Output Formatting**: `chalk`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- **GitHub Repository**: [https://github.com/alpharages/gitscribe](https://github.com/alpharages/gitscribe)
- **npm Package**: [https://www.npmjs.com/package/@alpharages/ai-commit-assistant](https://www.npmjs.com/package/@alpharages/ai-commit-assistant)
- **Issues**: [https://github.com/alpharages/gitscribe/issues](https://github.com/alpharages/gitscribe/issues)

## 🙏 Acknowledgments

- **Meta Llama** - For the powerful open-source Llama 3.2 language model
- **Hugging Face** - For the Transformers.js library enabling local AI processing
- **Conventional Commits** - For the commit message standard

---

Built with ❤️ for developers who value privacy and productivity.

