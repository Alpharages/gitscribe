# 🏗️ Architecture Document

## System Overview

The AI Git Commit Assistant follows a **layered architecture** designed for scalability, maintainability, and extensibility:

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js Dashboard]
        A[Web Interface]
        A[Repository Management]
        A[Real-time Updates]
    end
    
    subgraph "API Layer"
        B[REST Endpoints]
        B[Status Endpoint]
        B[Generate Endpoint]
        B[Commit Endpoint]
    end
    
    subgraph "Business Logic Layer"
        C[AI Processing Service]
        C[Model Management]
        C[Commit Generation]
    end
    
    subgraph "Data Access Layer"
        D[Git Service]
        D[Repository Operations]
        D[File System Access]
    end
    
    subgraph "CLI Layer"
        E[Command Interface]
        E[Multi-Repository Support]
        E[Configuration Management]
    end
    
    subgraph "Infrastructure Layer"
        F[Database]
        F[SQLite + Prisma]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    
    A --> E
    A --> C
    C --> E
```

## Component Breakdown

### Frontend Layer (Next.js 15)
- **AI Commit Dashboard** (`src/app/ai-commit/page.tsx`)
  - Repository selector with dropdown and file browser
  - Real-time status display with branch info
  - Visual diff viewer for staged changes
  - Interactive suggestion selection and commit interface
  - Recent commits history tracking
  - Multi-repository switching capability

### API Layer (Next.js Routes)
- **Status API** (`src/app/api/ai-commit/status/route.ts`)
  - Repository information and current status
  - Support for custom repository paths
  - Git branch and recent commits data

- **Generate API** (`src/app/api/ai-commit/generate/route.ts`)
  - AI-powered commit message generation
  - Configurable parameters (verbosity, temperature, tokens)
  - Multi-repository path support

- **Commit API** (`src/app/api/ai-commit/commit/route.ts`)
  - Direct Git commit execution
  - Repository-specific commit operations
  - Error handling and validation

### Business Logic Layer
- **AI Processing Service** (`src/lib/ai-assistant.ts`)
  - Local AI model management (Transformers.js)
  - Conventional commit generation
  - Context-aware analysis of code changes
  - Fallback logic for error scenarios
  - Configurable prompts and parameters

### Data Access Layer
- **Git Service** (`src/lib/git.ts`)
  - Repository detection and validation
  - Staged changes analysis
  - Commit operations (create, log, status)
  - Branch management and history
  - File system integration

### CLI Layer
- **Command Interface** (`src/cli/index.ts`)
  - Commander.js-based CLI structure
  - Subcommands: review, commit, status, config
  - Interactive mode support
  - Colored terminal output
  - Configuration file management
  - Global installation capability

### Infrastructure Layer
- **Database** (Prisma + SQLite)
  - Development database configuration
  - ORM for type-safe database operations
  - Migration and seeding support

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as U
    participant CLI as C
    participant Web as W
    participant API as A
    participant Git as G
    participant AI as AI

    U->>C: ai-commit review
    Note over C: CLI analyzes staged changes
    
    C->>A: GET /api/ai-commit/status
    Note over A: Web requests repository status
    
    A->>C: POST /api/ai-commit/generate
    Note over A: Web requests AI suggestions
    
    C->>A: {suggestions: [...]}
    Note over A: API returns commit suggestions
    
    U->>C: ai-commit commit
    Note over C: CLI commits with best suggestion
    
    C->>G: git commit -m "message"
    Note over G: CLI executes Git commit
    
    U->>W: Commit successful!
    Note over W: Web confirms success
```

## Security Architecture

### Input Validation
- **Sanitization**: All user inputs sanitized before processing
- **Path Validation**: Prevents directory traversal attacks
- **Repository Verification**: Ensures valid Git repository before operations
- **Configuration Bounds**: Validates AI model parameters and settings

### Data Protection
- **Local Processing**: No code data transmitted to external services
- **Optional Telemetry**: Usage analytics can be disabled
- **Encrypted Storage**: Sensitive data protection in configuration files
- **Audit Logging**: Complete operation audit trail

## Technology Choices Justification

### Frontend: Next.js 15
- **App Router**: Modern routing for better UX
- **TypeScript**: Type safety for maintainability
- **Tailwind CSS**: Utility-first styling with design system
- **shadcn/ui**: Consistent component library

### Backend: Node.js API Routes
- **RESTful Design**: Standard HTTP methods for compatibility
- **JSON Responses**: Structured data for frontend consumption
- **Error Handling**: Comprehensive error management

### AI: Transformers.js
- **Local Execution**: Privacy-preserving AI processing
- **Model Flexibility**: Support for different AI models
- **Browser Compatibility**: Works in all modern environments
- **No Cloud Dependencies**: Offline capability

### Database: Prisma + SQLite
- **Type Safety**: Compile-time database validation
- **Development Ready**: Simple setup for quick start
- **Production Ready**: Robust for scale

This architecture ensures the system is **secure, maintainable, and extensible** while providing the best possible user experience across all interfaces.