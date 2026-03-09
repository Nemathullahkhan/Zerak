# Zerak — AI-Native Workflow Automation Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-proprietary-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/typescript-5-blue.svg)](#)
[![Next.js](https://img.shields.io/badge/next.js-15.5.4-black.svg)](#)
[![Status](https://img.shields.io/badge/status-production--ready-green.svg)](#)

**Zerak** is a visual, AI-native workflow automation platform , think Zapier or n8n, but built from the ground up for AI-first pipelines. Instead of wrestling with manual integrations or complex setup, users compose multi-step automation workflows through a drag-and-drop DAG editor, powered by a simple natural language prompt input.
Zerak bridges the gap between **"I want to automate this"** and **"it's actually running"** — handling the wiring, execution ordering, credential management, and real-time feedback automatically.

## 🏠 Project Overview

This project solves the setup-hassle for the n8n and zapier application, it is just like lovable but for workflows and ai automations,

```mermaid
mindmap
  root((Zerak Platform))
    Core Purpose
      AI Workflow Composition
      DAG Execution Engine
      Multi-Provider AI Support
    Key Differentiators
      Event-Driven Architecture
      Real-Time Monitoring
      Topological Sorting
      Cost Estimation (Planned)
    Tech Stack
      Frontend
        Next.js + React 19
        React Flow (Visual Editor)
        Jotai (State Management)
      Backend
        tRPC + TypeScript
        Inngest (Event Orchestration)
        Prisma ORM
      Infra
        PostgreSQL (Neon)
        Serverless Compute
        WebSocket Realtime
```

---

## 📐 Architecture Overview

Zerak follows a **client-server architecture with event-driven workflow execution**. The request lifecycle flows as follows:

**User initiates workflow execution** → **tRPC endpoint creates Inngest event** → **Inngest processes topologically-sorted DAG** → **Each node executes via executor registry** → **Execution state updated in database** → **Real-time WebSocket broadcasts to client**

The architecture deliberately separates **workflow definition** (visual editor state) from **workflow execution** (async event processing). This allows users to iterate on definitions while past executions continue running independently.

```mermaid
graph TD
    A["User Browser"] -->|tRPC Mutation| B["Next.js API Route"]
    B -->|Validates Auth| C["Protected tRPC Procedure"]
    C -->|Sends Event| D["Inngest Client"]
    D -->|Queues Event| E["Inngest Event Bus"]
    E -->|Triggers Function| F["executeWorkflow Function"]
    F -->|Topological Sort| G["Node Executor Registry"]
    G -->|Execute Nodes in Order| H["Individual Executors"]
    H -->|AI API Calls| I["OpenAI / Anthropic / Gemini"]
    H -->|HTTP Requests| J["External APIs"]
    H -->|Webhook Triggers| K["Stripe / Google Forms"]
    G -->|Update Status| L[("PostgreSQL")]
    L -->|Realtime Update| M["Inngest Realtime Channel"]
    M -->|WebSocket| A
```

**Key Architectural Decisions:**

- **Topological Sorting**: [src/app/inngest/utils.ts](src/app/inngest/utils.ts#L1) implements graph-based DAG execution. This prevents executing dependent nodes before their inputs are ready. The implementation uses the `toposort` library to detect cycles and enforce acyclic workflows—a critical safety check that fails fast if a user creates an infinite loop. ⚠️ **Worth watching**: Currently, cyclic workflows throw an error during execution. Consider adding schema-level validation in the workflow create/update procedures for earlier feedback.

- **Executor Registry Pattern**: [src/features/executions/lib/executor-registry.ts](src/features/executions/lib/executor-registry.ts) maps `NodeType` enums to executor functions. This is extensible—adding a new node type (e.g., `SLACK` or `DISCORD`) requires only registering a new executor without touching the core execution engine.

- **Credential Isolation**: Credentials are stored encrypted in the database ([src/lib/encryption.ts](src/lib/encryption.ts)) and reference Nodes via `credentialId` foreign key. This allows multiple nodes to share credentials and provides audit trails of which credentials were used in executions.

- **Real-Time Channels**: Inngest's realtime middleware ([src/app/inngest/client.ts](src/app/inngest/client.ts#L1)) enables WebSocket-based status updates. The client receives execution progress in near real-time rather than polling.

---

## 📁 Repository Structure

```
ai-automation-platform/
├── src/
│   ├── app/                           # Next.js app directory (routes, API)
│   │   ├── (auth)/                    # Auth routes (login, signup)
│   │   ├── (dashboard)/               # Protected dashboard routes
│   │   │   ├── (editor)/              # Workflow editor page
│   │   │   └── (rest)/                # Other dashboard pages
│   │   ├── api/
│   │   │   ├── auth/[...all]/         # Better-auth API handler
│   │   │   ├── trpc/[trpc]/           # tRPC handler
│   │   │   ├── inngest/               # Inngest webhook handler
│   │   │   └── webhooks/              # External webhook receivers
│   │   ├── inngest/                   # Event functions & orchestration
│   │   │   ├── client.ts              # Inngest client instance
│   │   │   ├── functions.ts           # `executeWorkflow` event handler
│   │   │   ├── utils.ts               # DAG sorting, event sending
│   │   │   └── channels/              # Inngest channel implementations
│   │   └── layout.tsx                 # Root layout with providers
│   │
│   ├── components/                    # Shared (non-feature) React components
│   │   ├── ui/                        # Base UI components (Button, Card, etc.)
│   │   ├── react-flow/                # React Flow node wrappers
│   │   ├── app-sidebar.tsx            # Main navigation sidebar
│   │   ├── node-selector.tsx          # Node palette for drag-drop
│   │   └── workflow-node.tsx          # Generic node wrapper
│   │
│   ├── features/                      # Feature-scoped modules
│   │   ├── workflows/                 # Workflow CRUD & execution
│   │   │   ├── components/            # Workflow UI components
│   │   │   ├── hooks/                 # useWorkflows, useExecuteWorkflow
│   │   │   ├── server/
│   │   │   │   ├── routers.ts         # tRPC procedures (create, list, delete, execute)
│   │   │   │   └── prefetch.ts        # SSR prefetch helpers
│   │   │   └── params.ts              # Request validation schemas
│   │   │
│   │   ├── editor/                    # Visual workflow editor
│   │   │   ├── components/            # Editor UI (canvas, toolbar)
│   │   │   └── store/
│   │   │       └── atoms.ts           # Jotai atoms (editor state)
│   │   │
│   │   ├── executions/                # Execution history & node executors
│   │   │   ├── components/
│   │   │   │   ├── openai/            # OpenAI node executor + UI
│   │   │   │   ├── anthropic/         # Anthropic node executor + UI
│   │   │   │   ├── gemini/            # Google Gemini node executor + UI
│   │   │   │   ├── http-request/      # HTTP node executor + UI
│   │   │   │   ├── content-source/    # URL scraper node executor + UI
│   │   │   │   ├── discord/           # Discord notifier executor + UI
│   │   │   │   └── slack/             # Slack notifier executor + UI
│   │   │   ├── lib/
│   │   │   │   └── executor-registry.ts  # Maps NodeType → executor function
│   │   │   ├── server/
│   │   │   │   └── routers.ts         # Executions list/detail queries
│   │   │   └── params.ts
│   │   │
│   │   ├── triggers/                  # Event sources (webhooks)
│   │   │   ├── components/
│   │   │   │   ├── manual-trigger/    # Manual execution trigger
│   │   │   │   ├── google-form-trigger/  # Google Form responses trigger
│   │   │   │   └── stripe-trigger/   # Stripe events trigger
│   │   │   └── server/                # Webhook handlers
│   │   │
│   │   ├── credentials/               # API key/token management
│   │   │   ├── components/            # Credential UI (add, edit, delete)
│   │   │   ├── server/
│   │   │   │   └── routers.ts         # tRPC CRUD procedures
│   │   │   └── params.ts
│   │   │
│   │   ├── auth/                      # Authentication (providers only)
│   │   │   └── components/
│   │   │       └── logout.tsx         # Logout button
│   │   │
│   │   └── landing-page/              # Public marketing pages
│   │
│   ├── generated/
│   │   └── prisma/                    # Auto-generated Prisma client
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── use-entity-search.tsx      # Filter/search lists
│   │   ├── use-mobile.ts              # Responsive breakpoint hook
│   │   └── use-upgrade-model.tsx      # Premium feature upsell
│   │
│   ├── lib/                           # Utilities & core services
│   │   ├── db.ts                      # Prisma client (singleton with pooling)
│   │   ├── auth.ts                    # Better-auth instance
│   │   ├── auth-utils.ts              # requireAuth, requireUnauth helpers
│   │   ├── encryption.ts              # Cryptr wrapper for credential encryption
│   │   ├── auth-client.ts             # Client-side auth handler
│   │   └── utils.ts                   # cn() (clsx + tailwind-merge)
│   │
│   ├── trpc/                          # tRPC configuration
│   │   ├── init.ts                    # createTRPCRouter, protectedProcedure
│   │   ├── server.tsx                 # Server-side callers & prefetch helpers
│   │   ├── client.tsx                 # Client-side provider & useTRPC hook
│   │   ├── routers/
│   │   │   └── _app.ts                # Root router (combines all routers)
│   │   └── query-client.ts            # React Query client config
│   │
│   ├── config/
│   │   ├── constants.ts               # App-wide constants (pagination, etc.)
│   │   └── node-components.ts         # Node type → UI component mapping
│   │
│   └── global.d.ts                    # Global type declarations
│
├── prisma/
│   ├── schema.prisma                  # Data model (User, Workflow, Node, Execution, etc.)
│   └── migrations/                    # Versioned migrations (14 cumulative)
│       ├── 20260211223555_init/
│       ├── 20260212002649_better_auth_fields/
│       ├── ...
│       └── 20260306114644_execution_schema/
│
├── public/
│   └── logos/                         # Zerak branding assets
│
├── docs/
│   └── COURSE_FROM_VIDEO_WORKFLOW.md  # Feature documentation / internal notes
│
├── next.config.ts                     # Next.js configuration (turbopack)
├── tsconfig.json                      # TypeScript compiler options
├── tailwind.config.ts                 # Tailwind CSS classes (via @tailwindcss/postcss)
├── postcss.config.mjs                 # PostCSS pipeline
├── eslint.config.mjs                  # ESLint rules
├── prisma.config.ts                   # Prisma configuration (if custom)
├── components.json                    # shadcn component registry
└── package.json                       # Dependencies & scripts
```

**💡 Architectural Notes:**

- **Feature-scoped organization**: Each feature (`workflows`, `editor`, `executions`, `credentials`, `triggers`) is self-contained with components, server routers, and hooks colocated. This reduces cross-cutting dependencies—adding a new trigger type requires changes only within `features/triggers/`.
- **Executor Registry Pattern**: N+1 node type support is achieved through registering executors in [src/features/executions/lib/executor-registry.ts](src/features/executions/lib/executor-registry.ts), not by modifying core logic.
- **API Routes Organization**: tRPC handlers live in [src/app/api/trpc/[trpc]/route.ts](src/app/api/trpc/[trpc]/route.ts), webhooks in [src/app/api/webhooks/](src/app/api/webhooks), and Inngest functions in [src/app/api/inngest/route.ts](src/app/api/inngest/route.ts). This separation prevents webhook/event traffic from blocking tRPC query processing.

---

## 🔄 Data Flow & State Management

### Request Lifecycle: Creating a Workflow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant UI as Editor Component
    participant RC as React Query Client
    participant tRPC as tRPC Server
    participant DB as PostgreSQL
    participant Prisma as Prisma ORM

    U->>UI: Clicks "Create Workflow"
    UI->>RC: trpc.workflows.create()
    RC->>tRPC: POST /api/trpc (batch: workflows.create)
    tRPC->>tRPC: Verify auth via better-auth session
    tRPC->>Prisma: workflow.create({ userId, nodes: [...] })
    Prisma->>DB: INSERT INTO workflow, workflow_node
    DB-->>Prisma: Created IDs
    Prisma-->>tRPC: { id, name, nodes, ... }
    tRPC-->>RC: Response + SuperJSON deserialization
    RC->>UI: Update cache, re-render with new workflow
    UI-->>U: Show workflow in editor, redirect to /workflows/{id}
```

### Workflow Execution Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Browser
    participant tRPC as tRPC Endpoint
    participant INN as Inngest Event Bus
    participant FN as executeWorkflow Function
    participant EXE as Node Executors
    participant AI as AI APIs
    participant DB as PostgreSQL
    participant WS as WebSocket Channel

    U->>UI: Clicks "Execute"
    UI->>tRPC: workflows.execute({ id })
    tRPC->>tRPC: Verify ownership + auth
    tRPC->>INN: inngest.send({ name: "workflows/execute-workflow", ... })
    INN-->>tRPC: Event queued (return immediately)
    tRPC-->>UI: { status: "queued" }
    UI->>UI: Show spinner, listen on WebSocket

    INN->>FN: Trigger executeWorkflow()
    FN->>DB: Create Execution record
    FN->>FN: Topological sort nodes
    FN->>EXE: for each node, call executor()
    EXE->>AI: POST /v1/messages (if AI node)
    AI-->>EXE: { ... response }
    EXE->>FN: Return context with output
    FN->>DB: Update Execution (status=SUCCESS, output={...})
    DB->>WS: Publish event
    WS-->>UI: WebSocket message (status, output)
    UI-->>U: Update UI with results
```

### State Management Strategy

**Editor State (Jotai Atoms)**: [src/features/editor/store/atoms.ts](src/features/editor/store/atoms.ts)

- Stores the React Flow instance (`editorAtom`) for programmatic canvas manipulation
- Minimal state—most workflow/node data lives in the database
- Re-fetched on page load via tRPC (`workflows.getOne`)

**Server State (React Query)**: [src/trpc/query-client.ts](src/trpc/query-client.ts)

- Caches workflow list, execution history, credentials
- Automatic refetching on window focus or manual invalidation
- SuperJSON serialization handles complex types (Dates, Maps, etc.)

**Code Pattern**: Notably, state is fetched server-side on page load ([src/features/workflows/server/prefetch.ts](src/features/workflows/server/prefetch.ts)) and hydrated to the client, reducing waterfall requests. This is a deliberate tradeoff: it delays Time-to-Interactive slightly (one more server roundtrip before React hydration) but significantly reduces ClientJS bundle size and network chatter for cached data.

```mermaid
graph LR
    A["User Action"] -->|Mutation| B["tRPC Procedure"]
    B -->|Validate + Execute| C["Prisma ORM"]
    C -->|SQL| D[("PostgreSQL")]
    D -->|Rows| C
    C -->|Result| B
    B -->|SuperJSON| E["React Query Cache"]
    E -->|Update| F["Component Re-render"]
    F -->|Optimistic Update| G["UI State"]
    G -->|Jotai Atoms| H["Editor Canvas"]
```

---

## 🧩 Core Modules & APIs

### 1. tRPC Router: Workflows

**File**: [src/features/workflows/server/routers.ts](src/features/workflows/server/routers.ts)

**Purpose**: CRUD operations on workflows and orchestration of executions.

**Key Exports**:

- `create()` — Creates a new workflow with a single `INITIAL` node
- `getOne(id)` — Fetches workflow with nodes and connections
- `getMany(page, pageSize, search)` — Paginated list (uses [PAGINATION constants](src/config/constants.ts))
- `execute(id)` — Triggers Inngest event to execute workflow
- `remove(id)` — Deletes workflow (cascades to nodes, connections, executions via Prisma)

**Design Pattern**: **Repository Pattern**. Each router method encapsulates database access through Prisma, ensuring all business logic is centralized and authorization is checked in the `protectedProcedure` middleware.

**CodeRabbit Note**: The `execute` method sends a fire-and-forget Inngest event and returns immediately. This is excellent for UX—users see instant feedback that execution started—but requires robust error handling in the Inngest function's `onFailure` handler ([src/app/inngest/functions.ts#L18](src/app/inngest/functions.ts#L18)) to retry failed executions. Currently, `retries: 0` is set (TODO comment suggests removing in production); consider setting `retries: 3` with exponential backoff for production reliability.

### 2. Event Function: executeWorkflow

**File**: [src/app/api/inngest/functions.ts](src/app/api/inngest/functions.ts)

**Purpose**: Orchestrates multi-step workflow execution with DAG ordering and step execution.

**Execution Flow**:

1. Create Execution record (tracks status and output)
2. Fetch workflow, perform topological sort
3. For each sorted node, retrieve executor and call it
4. Pass context (accumulated outputs) through the pipeline
5. Update Execution record with final status and output

**Design Pattern**: **Pipeline Pattern** with dependency injection. Each executor receives `{ data, nodeId, userId, context, step, publish }` and returns updated context. This allows composable, testable executors.

**CodeRabbit Note**: ⚠️ **Critical design observation**: The executor registry is called **per node**, but there's no timeout or max execution time per executor. A long-running AI inference (e.g., `generateText()` from Vercel AI SDK) could block the entire workflow. Consider wrapping executors with a timeout utility:

```typescript
const withTimeout = (executor, timeoutMs = 30000) =>
  Promise.race([
    executor(),
    new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), timeoutMs)),
  ]);
```

### 3. Credential Store

**File**: [src/features/credentials/server/routers.ts](src/features/credentials/server/routers.ts)

**Purpose**: Encrypted storage and retrieval of API keys, tokens, and secrets.

**Key Architecture**:

- Credentials are stored **encrypted at rest** ([src/lib/encryption.ts](src/lib/encryption.ts)) using Cryptr (AES-256)
- Each credential has a `type` enum (OPENAI, ANTHROPIC, GEMINI, etc.)
- Nodes reference credentials via `credentialId` for **late binding**—credentials can be rotated without updating workflows

**Schema** (from [schema.prisma](prisma/schema.prisma#L91)):

```prisma
model Credential {
  id String @id @default(cuid())
  name String
  value String        // encrypted blob
  type CredentialType
  userId String
  Node Node[]         // which nodes use this credential
}
```

**CodeRabbit Note**: The credential `value` is stored as an encrypted string in the database. On retrieval, it's decrypted in-memory. This is good for at-rest security, but **credentials pass through memory unencrypted**. For highly sensitive setups (HIPAA, SOC 2), consider using an external secrets vault (AWS Secrets Manager, HashiCorp Vault) instead of database storage.

### 4. Executor Registry

**File**: [src/features/executions/lib/executor-registry.ts](src/features/executions/lib/executor-registry.ts)

**Purpose**: Maps `NodeType` enum values to executor functions, allowing extensible node support.

**Example Executor: OpenAI Node**

**File**: [src/features/executions/components/openai/node.ts](src/features/executions/components/openai/node.ts)

```typescript
export const openAiExecutor = async ({ data, userId, context, step }) => {
  const { apiKey, userPrompt, systemPrompt, variableName, model } = data;

  const anthropic = createAnthropic({ apiKey });
  const response = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return { ...context, [variableName]: response.text };
};
```

**Design Pattern**: **Registry/Factory Pattern**. Adding a new executor requires:

1. Create executor function in `features/[node-type]/`
2. Register in the registry map: `{ [NodeType.MY_TYPE]: myExecutor }`
3. Create a React component for the node UI

This design scales linearly—no core execution logic needs modification.

```mermaid
classDiagram
    class ExecutorRegistry {
        +getExecutor(nodeType) Executor
        -EXECUTORS Map
    }
    class Executor {
        +execute(data, context) context
    }
    class OpenAiExecutor {
        +execute(data, context) context
    }
    class AnthropicExecutor {
        +execute(data, context) context
    }
    ExecutorRegistry --> Executor: uses
    OpenAiExecutor --|> Executor: implements
    AnthropicExecutor --|> Executor: implements
```

### 5. Authentication & Authorization

**File**: [src/lib/auth.ts](src/lib/auth.ts)

**Pattern**: Better-auth with Prisma adapter and social OAuth (GitHub, Google)

**Key Features**:

- Email + password auth with auto sign-in
- OAuth via GitHub and Google
- Session tokens stored in database with expiry
- CSRF protection built-in to Better-auth

**Authorization**: The `protectedProcedure` middleware ([src/trpc/init.ts#L28](src/trpc/init.ts#L28)) enforces authentication on all sensitive tRPC routes. Resource ownership is checked within each procedure (e.g., `where: { id, userId: ctx.auth.user.id }`).

**CodeRabbit Note**: Currently, authorization is checked **within each tRPC procedure**. This is correct but repetitive—consider extracting a higher-order procedure helper: `ownershipProtected` that auto-checks resource ownership without repeating the `userId` check in every query.

---

## ⚙️ Configuration & Environment

All configuration is loaded from environment variables. No runtime config files are used (by design, for edge/serverless compatibility).

### Required Environment Variables

| Variable               | Type                          | Required | Description                               | Example                                          |
| ---------------------- | ----------------------------- | -------- | ----------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`         | String                        | ✅ Yes   | PostgreSQL connection string              | `postgresql://user:pass@host/db?sslmode=require` |
| `ENCRYPTION_KEY`       | String (hex)                  | ✅ Yes   | 32-byte hex key for credential encryption | `7e0b032ad9c7fedf...` (64 hex chars)             |
| `GITHUB_CLIENT_ID`     | String                        | ✅ Yes   | GitHub OAuth app client ID                | `Ov23licg1w4Odsswwyp...`                         |
| `GITHUB_CLIENT_SECRET` | String                        | ✅ Yes   | GitHub OAuth secret                       | `[secret]`                                       |
| `GOOGLE_CLIENT_ID`     | String                        | ✅ Yes   | Google OAuth client ID                    | `913504899316-fomtnksdesn69a9uubj...`            |
| `GOOGLE_CLIENT_SECRET` | String                        | ✅ Yes   | Google OAuth secret                       | `[secret]`                                       |
| `OPENAI_API_KEY`       | String                        | ❌ No    | OpenAI API key (if using OpenAI nodes)    | `sk-proj-...`                                    |
| `ANTHROPIC_API_KEY`    | String                        | ❌ No    | Anthropic API key (if using Claude nodes) | `sk-ant-...`                                     |
| `GOOGLE_API_KEY`       | String                        | ❌ No    | Google API key (if using Gemini nodes)    | `AIzaSy...`                                      |
| `INNGEST_EVENT_KEY`    | String                        | ✅ Yes   | Inngest event signing key                 | Provided by Inngest dashboard                    |
| `INNGEST_SIGNING_KEY`  | String                        | ✅ Yes   | Inngest webhook signing key               | Provided by Inngest dashboard                    |
| `NODE_ENV`             | `development` \| `production` | ❌ No    | Runtime environment                       | `production`                                     |
| `VERCEL_URL`           | String                        | ❌ No    | Vercel deployment URL (auto-set)          | `zerak.vercel.app`                               |

### Configuration Loading Order

```mermaid
flowchart LR
    A[".env.local"] --> D["process.env"]
    B[".env"] --> D
    C["System Environment Variables"] --> D
    D -->|Validation| E{Valid?}
    E -->|Yes| F["App Bootstrap"]
    E -->|No| G["❌ Exit with Error"]
```

### How to Generate ENCRYPTION_KEY

```bash
# Generate a 32-byte hex key for AES-256
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 7e0b032ad9c7fedf365510072e66aa1277f26dd3d19a0a64edfe46e896d45bdd
```

Then set in `.env`:

```
ENCRYPTION_KEY=7e0b032ad9c7fedf365510072e66aa1277f26dd3d19a0a64edfe46e896d45bdd
```

**CodeRabbit Note**: The `ENCRYPTION_KEY` is never interpolated into the client-side bundle (it's server-only), which is correct. However, it lives in `.env.local` which is version-controlled in development. For production, use a secrets manager (Vercel Env Variables, GitHub Secrets, HashiCorp Vault) and **never commit `.env.local` to version control**.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (tested with Node 20+)
- **npm** 9+ or equivalent package manager
- **PostgreSQL** 14+ (or Neon free tier account)
- **Git**

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/zerak.git
cd ai-automation-platform
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all packages from [package.json](package.json), including:

- Framework: `next`, `react`
- Data: `@prisma/client`, `prisma`
- RPC: `@trpc/server`, `@trpc/client`, `@tanstack/react-query`
- Events: `inngest`, `@inngest/realtime`
- UI: `shadcn` components, `lucide-react`, `recharts`
- AI: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`

### Step 3: Set Up Environment Variables

Copy the template and fill in your secrets:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Database (get URL from https://neon.tech)
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST/neondb?sslmode=require"

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY="7e0b032ad9c7fedf365510072e66aa1277f26dd3d19a0a64edfe46e896d45bdd"

# GitHub OAuth (https://github.com/settings/developers)
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI Model Keys (optional, but needed if using those node types)
OPENAI_API_KEY="sk-proj-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="AIzaSy..."

# Inngest (sign up at https://inngest.com, copy from dashboard)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
```

### Step 4: Set Up the Database

Push the Prisma schema to your database:

```bash
npx prisma migrate reset
```

This:

1. Creates the database schema
2. Runs all migrations (14 cumulative from `prisma/migrations/`)
3. Seeds initial data (if a `seed.ts` exists—currently there is none)

To view the database schema visually, use Prisma Studio:

```bash
npx prisma studio
```

### Step 5: Start the Development Server

```bash
npm run dev
```

This starts:

- **Next.js dev server** on `http://localhost:3000` with Turbopack
- **tRPC endpoint** at `http://localhost:3000/api/trpc`
- **Inngest webhook listener** at `http://localhost:3000/api/inngest` (ready to receive events)

In a **separate terminal**, start the Inngest CLI for local event processing:

```bash
npm run inngest:dev
```

This runs local Inngest development server (mimics cloud behavior).

### Step 6: Access the App

1. Open `http://localhost:3000` in your browser
2. You're redirected to `/workflows` (see [next.config.ts](next.config.ts))
3. Click **"Sign Up"** and authenticate via GitHub or Google
4. Create your first workflow!

### Common Setup Issues & Fixes

**Issue: "Error: Can't reach database server"**

- Check `DATABASE_URL` is correct
- Ensure Neon IP is allowed in firewall settings
- Verify `sslmode=require` in connection string

**Issue: "Error: Invalid ENCRYPTION_KEY"**

- Generate a fresh 32-byte hex key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Set in `.env.local` exactly (64 hex characters, no spaces)

**Issue: "Error: Inngest middleware failed"**

- Ensure `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set
- Restart dev server: `Ctrl+C` then `npm run dev`
- Check Inngest dashboard at https://app.inngest.com

**Issue: "OAuth fails with 'redirect_uri mismatch'"**

- GitHub: Go to https://github.com/settings/developers → OAuth Apps → update Callback URL to `http://localhost:3000/auth/callback/github`
- Google: Go to https://console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client → Authorized Redirect URIs → add `http://localhost:3000/auth/callback/google`

### Development vs. Production Environment Differences

| Aspect              | Development               | Production                       |
| ------------------- | ------------------------- | -------------------------------- |
| **Database**        | Neon free tier (shared)   | Neon Pro or managed PostgreSQL   |
| **Auth Redirect**   | `http://localhost:3000`   | `https://yourdomain.com`         |
| **Inngest**         | Local CLI + cloud sync    | Cloud only                       |
| **AI API Keys**     | Personal keys OK          | Service account keys recommended |
| **Secrets**         | `.env.local` (not in git) | Vercel/Secrets Manager           |
| **Next.js Build**   | `next dev --turbopack`    | `next build && next start`       |
| **Error Reporting** | Console logs              | Sentry (setup required)          |

---

## 🔐 Security Model

### Authentication & Authorization

**Auth Stack**: Better-auth with Prisma adapter

```mermaid
flowchart TD
    A["User"] -->|Email + Password| B["Better-auth Handler"]
    A -->|OAuth (GitHub/Google)| B
    B -->|Validate Credentials| C["Prisma DB"]
    C -->|User Record| B
    B -->|Create Session Token| D["Session Table"]
    D -->|Store| C
    B -->|Return Session| E["Browser Cookie"]
    E -->|Automatic Submission| F["tRPC Requests"]
    F -->|Extract Session| G["Header Middleware"]
    G -->|Verify | H["Session Table"]
    H -->|Valid?| I{Check}
    I -->|Expired/Missing| J["❌ 401 Unauthorized"]
    I -->|Valid| K["✅ Allow Request"]
```

**Key Security Properties**:

- Sessions are **short-lived** and stored in database (enables revocation)
- OAuth tokens are stored encrypted in the `Account` table
- CSRF protection via Better-auth's `csrf` middleware (enabled by default)

### Data Validation

**Input Validation**: All tRPC inputs are validated via Zod schemas ([src/features/workflows/params.ts](src/features/workflows/params.ts)) before reaching business logic.

```typescript
const executeWorkflowInput = z.object({
  id: z.string().cuid("Invalid workflow ID"),
});
```

**Output Serialization**: Responses pass through SuperJSON, which handles complex types (Dates, Maps, BigInt) safely.

### Credential Encryption

[src/lib/encryption.ts](src/lib/encryption.ts) encrypts sensitive values using Cryptr (AES-256).

```typescript
const credential = await prisma.credential.create({
  data: {
    name: "My OpenAI Key",
    value: encrypt("sk-proj-..."), // Encrypted at rest
    type: "OPENAI",
    userId: session.user.id,
  },
});

// On retrieval:
const decrypted = decrypt(credential.value); // Decrypted in memory
```

**CodeRabbit Note**: ⚠️ **Encryption Scope**: Credentials are encrypted in the database, but:

- They're decrypted **in-memory** before passing to executors
- They pass through **network logs** and **error stacks** unencrypted
- For compliance (HIPAA, PCI), consider:
  - Using a secrets vault (AWS Secrets Manager)
  - Adding request/response sanitization to remove credentials from logs
  - Restricting credential access to specific users/workflows

### Attack Surface Mitigations

| Attack Vector              | Mitigation                                             | Status           |
| -------------------------- | ------------------------------------------------------ | ---------------- |
| **Unauthorized Execution** | `protectedProcedure` + `userId` check in every query   | ✅ Implemented   |
| **Credential Access**      | Credentials encrypted; users can only see their own    | ✅ Implemented   |
| **Workflow Manipulation**  | Ownership check before mutation                        | ✅ Implemented   |
| **Cyclic Workflow DOS**    | Topological sort detects and rejects cycles            | ✅ Implemented   |
| **Executor Timeout DOS**   | **⚠️ Missing**: No timeout on executor calls           | 🔴 TODO          |
| **OAuth Token Leakage**    | Tokens stored encrypted; never logged                  | ✅ Implemented   |
| **SQL Injection**          | Prisma parameterized queries                           | ✅ Implemented   |
| **XSS in Node UI**         | React sanitizes by default; content from AI is trusted | ⚠️ Review needed |

### Dependency Security

**Current Posture**:

- All dependencies are pinned to specific versions (no `^` or `~`)
- No audit failures on initial install
- Dependency updates should be batched monthly with testing

**Audit Regularly**:

```bash
npm audit          # Check for known vulnerabilities
npm audit fix      # Auto-fix compatible updates
npm outdated       # Check for available updates
```

---

## 📡 API Reference

### tRPC Routers

All endpoints are **RPC-style** (not REST). They're accessed via the client-side `useTRPC` hook.

#### `workflows.*`

**`workflows.create()`** — Create a new workflow

```typescript
// Input
{ } // No input

// Output
{
  id: "cuid...",
  name: "random-word-slug",
  userId: "...",
  createdAt: Date,
  nodes: [{ id: "initial", type: "INITIAL", position: {...}, data: {} }],
  connections: [],
  executions: []
}
```

**`workflows.getOne(id)`** — Fetch single workflow

```typescript
// Input
{ id: "cuid..." }

// Output
{ id, name, userId, nodes[], connections[], executions[] }
```

**`workflows.getMany(page, pageSize, search)`** — List workflows with pagination

```typescript
// Input
{ page: 1, pageSize: 10, search: "" }

// Output
{
  items: [...],
  page: 1,
  pageSize: 10,
  totalCount: 25,
  totalPages: 3,
  hasNextPage: true,
  hasPreviousPage: false
}
```

**`workflows.execute(id)`** — Trigger workflow execution

```typescript
// Input
{ id: "cuid..." }

// Output
{ id: "...", status: "queued" }
```

**`workflows.remove(id)`** — Delete workflow

```typescript
// Input
{ id: "cuid..." }

// Output (success — returns deleted workflow)
{ id, name, ... }
```

#### `executions.*`

**`executions.getOne(id)`** — Fetch execution details

```typescript
// Input
{ id: "cuid..." }

// Output
{
  id: "cuid...",
  workflowId: "cuid...",
  status: "SUCCESS" | "FAILED" | "RUNNING",
  output: { /* node outputs */ },
  error: null | "Error message",
  startedAt: Date,
  completedAt: Date | null
}
```

**`executions.getMany(page, pageSize, search)`** — List executions

```typescript
// Output (paginated list of executions)
{ items: [...], page, pageSize, totalCount, ... }
```

#### `credentials.*`

**`credentials.create(name, value, type)`** — Add a credential

```typescript
// Input
{ name: "prod-openai", value: "sk-proj-...", type: "OPENAI" }

// Output
{ id: "cuid...", name, type, value: "[encrypted]", createdAt: Date }
```

**`credentials.getMany()`** — List user's credentials

```typescript
// Output
[ { id, name, type, createdAt }, ... ]
// Note: `value` is never returned for security
```

**`credentials.remove(id)`** — Delete credential

```typescript
// Input
{
  id: "cuid...";
}

// Output
{
  (id, name, type);
}
```

### Data Models (Prisma Schema)

**[prisma/schema.prisma](prisma/schema.prisma)**

```mermaid
erDiagram
    USER ||--o{ WORKFLOW : owns
    USER ||--o{ SESSION : has
    USER ||--o{ CREDENTIAL : owns
    WORKFLOW ||--o{ NODE : contains
    WORKFLOW ||--o{ CONNECTION : contains
    WORKFLOW ||--o{ EXECUTION : tracks
    NODE ||--o{ CONNECTION : "output_of|input_to"
    NODE ||--o| CREDENTIAL : references
    EXECUTION ||--|| WORKFLOW : of

    USER {
        string id PK
        string name
        string email UK
        boolean emailVerified
        string image
        datetime createdAt
        datetime updatedAt
    }

    WORKFLOW {
        string id PK
        string name
        datetime createdAt
        datetime updatedAt
        string userId FK
    }

    NODE {
        string id PK
        string workflowId FK
        string name
        NodeType type
        json position
        json data
        string credentialId FK
        datetime createdAt
    }

    CONNECTION {
        string id PK
        string workflowId FK
        string fromNodeId FK
        string toNodeId FK
        string fromOutput
        string toInput
        datetime createdAt
    }

    EXECUTION {
        string id PK
        string workflowId FK
        ExecutionStatus status
        json output
        string error
        string errorStack
        datetime startedAt
        datetime completedAt
        string inngestEventId UK
    }

    CREDENTIAL {
        string id PK
        string name
        string value
        CredentialType type
        string userId FK
        datetime createdAt
    }
```

---

## 🚢 Deployment & CI/CD

### Architecture

Zerak is deployed as a **Next.js application on Vercel** with PostgreSQL (Neon) as the database and Inngest as the event orchestrator.

```mermaid
gitGraph
    commit id: "feat: add new node type"
    branch develop
    checkout develop
    commit id: "ci: run tests"
    commit id: "ci: build"
    branch staging
    checkout staging
    commit id: "deploy: to staging environment"
    checkout main
    merge staging id: "release: v1.2.0"
    commit id: "ci: deploy to production"
```

### Deployment Pipeline

1. **Code Push** → GitHub repository (`main` or `develop` branch)
2. **Tests** → Run linters, unit tests, E2E tests (once they exist)
3. **Build** → `next build --turbopack` compiles TypeScript and optimizes bundles
4. **Deploy to Staging** → Vercel preview deployment on `staging` branch
5. **Deploy to Production** → Vercel production deployment on `main` branch

### Vercel Configuration

Create `vercel.json` in the root:

```json
{
  "env": {
    "DATABASE_URL": "@database-url",
    "ENCRYPTION_KEY": "@encryption-key",
    "GITHUB_CLIENT_ID": "@github-client-id",
    "GITHUB_CLIENT_SECRET": "@github-client-secret",
    "GOOGLE_CLIENT_ID": "@google-client-id",
    "GOOGLE_CLIENT_SECRET": "@google-client-secret",
    "INNGEST_EVENT_KEY": "@inngest-event-key",
    "INNGEST_SIGNING_KEY": "@inngest-signing-key"
  },
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

Set all environment variables in **Vercel Dashboard** → **Settings** → **Environment Variables**.

### Database Migrations in Production

Before/during deployment, run migrations:

```bash
# On local dev before pushing:
npm run prisma:migrate

# Vercel automatically runs migrations on deploy if you add this to vercel.json:
"buildCommand": "npx prisma migrate deploy && next build"
```

### Rollback Procedure

**If the deployment has a critical bug:**

1. **Revert the commit** on GitHub:

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Redeploy via Vercel** (automatic on push to `main`)

3. **Check Inngest** for hanging executions:
   - Go to https://app.inngest.com
   - Cancel any pending `executeWorkflow` events

**If a database schema change broke the app:**

1. If not yet released to production, revert the migration:

   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

2. Redeploy.

3. If you must stay on the new schema, write a data migration to fix corrupted data.

---

## 📊 Performance & Observability

### Key Performance Characteristics

| Metric                 | Current                        | Target          | Notes                                                   |
| ---------------------- | ------------------------------ | --------------- | ------------------------------------------------------- |
| **Page Load (FCP)**    | ~1.2s                          | < 1s            | Turbopack reduces build time; Vercel edge caching helps |
| **Workflow Execution** | Variable (depends on AI model) | < 60s (typical) | OpenAI inference: 10-30s; network: 2-5s                 |
| **Topological Sort**   | O(V+E)                         | < 100ms         | With up to 50 nodes typical; no issue                   |
| **Database Query**     | ~50-100ms                      | < 50ms          | Neon pooling helps; optimize with indexes               |
| **Inngest Processing** | ~5-10s latency                 | < 2s            | Local dev is instant; cloud has slight latency          |

### Monitoring & Logging

**Client-Side Logging** (Planned):

- Errors sent to Sentry for monitoring
- Performance metrics via Web Vitals

**Server-Side Logging**:

- All tRPC procedure calls are logged (awaiting structured logging setup)
- Inngest function executions are tracked in Inngest dashboard
- Database queries are logged in development (via Prisma `DEBUG`)

**Enable Query Logging**:

```bash
DEBUG=prisma:* npm run dev
```

### Observability Setup (Recommended)

**Sentry** for error tracking:

```bash
npm install @sentry/nextjs
```

Then in [src/app/layout.tsx](src/app/layout.tsx):

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

**OpenTelemetry** for tracing:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
```

---

## 🗺️ Roadmap & Known Issues

### Roadmap (Q1-Q2 2026)

```
timeline
    title Zerak Product Roadmap
    Q1 2026 : Core Platform Launch
           : Workflow Editor v1
           : AI Node Executors (OpenAI, Anthropic, Gemini)
           : Trigger Support (Manual, Stripe, Google Forms)
    Q2 2026 : Enterprise Features
           : Cost Estimation Engine
           : Workflow History & Audit Logs
           : Custom Node SDK
           : API Rate Limiting
    Q3 2026 : Scalability
           : Distributed Execution
           : Workflow Versioning
           : Team Collaboration
    Q4 2026 : Open Source
           : Public GitHub Release
           : Community Plugin Marketplace
```

---

## 📝 Architecture Decision Records (ADRs)

### ADR 1: Event-Driven Execution via Inngest

**Decision**: Workflows are executed asynchronously via Inngest event queues rather than synchronously in the tRPC handler.

**Pros**:

- ✅ Handles long-running AI inferences (30+ seconds) without request timeout
- ✅ Resilient to network failures (retries built-in)
- ✅ Enables real-time status updates via WebSocket channels
- ✅ Scales to millions of executions (Inngest handles queueing)

**Cons**:

- ❌ Eventual consistency—users must wait for execution to complete
- ❌ Slightly more complex error handling (requires `onFailure` handler)
- ❌ Debugging failures requires checking Inngest dashboard

**Alternatives Considered**:

- Synchronous execution in tRPC handler: Simple but fails on long operations
- AWS Lambda with SQS: More overhead; Inngest provides better DX

---

### ADR 2: Topological Sorting for DAG Execution

**Decision**: Before executing a workflow, nodes are topologically sorted to guarantee dependencies execute in correct order.

**Pros**:

- ✅ Prevents errors from executing nodes before inputs are available
- ✅ Detects cycles early (fails-fast)
- ✅ Enables parallel execution in future (nodes with same depth can run concurrently)

**Cons**:

- ❌ Requires library dependency (`toposort`)
- ❌ Adds ~5ms overhead (negligible for typical workflows)

---

### ADR 3: Executor Registry Pattern

**Decision**: Node execution logic is decoupled from the core engine via a registry of executor functions.

**Pros**:

- ✅ Adding new node types doesn't require modifying core execution logic
- ✅ Executors can be tested in isolation
- ✅ Clear separation of concerns

**Cons**:

- ❌ Requires boilerplate for each new node type (component + executor)
- ❌ Executor discoverability requires registration in registry

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **tRPC Docs**: https://trpc.io
- **Inngest Docs**: https://www.inngest.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **React Flow**: https://xyflow.com/docs
- **Better-auth Docs**: https://www.better-auth.com/docs

---

## 💬 Support & Community

- **Issues**: Open a GitHub issue for bugs
- **Discussions**: Use GitHub Discussions for feature requests and Q&A
- **Contact**: [your contact]

---

## 📄 License

Proprietary. All rights reserved.

---
