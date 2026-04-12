# ZERAK: THE AI-NATIVE WORKFLOW ENGINE
## Comprehensive Engineering Project Document & Architectural Deep-Dive

---

## 1. 🧾 THE NARRATIVE: A TALE OF TWO JOURNEYS

### 🚀 JOURNEY 1: THE FULLSTACK FOUNDATION
**The Goal**: Build a robust, scalable workflow automation platform using the modern **T3-inspired stack** (Next.js, Prisma, PostgreSQL).
**The Challenge**: Managing complex, multi-tenant state. I had to design a schema that wasn't just "CRUD" but "Logic-Aware." This meant building a **Node-Edge model** that could represent Directed Acyclic Graphs (DAGs) in a relational database.
**Result**: A stable core capable of persisting 100+ node workflows with strict referential integrity.

### 🤖 JOURNEY 2: THE AI INFLECTION POINT
**The Discovery**: During my internship, I saw the power of **n8n**. But I also saw the **friction**. Even with "No-Code," users spend hours mapping variables.
**The Question**: *"Can we treat the workflow itself as an output of an LLM?"*
**The Pivot**: I shifted Zerak from a manual editor to an **AI-native ecosystem**. Implementation meant overcoming non-deterministic LLM behavior, handling malformed streaming JSON, and building a benchmarking suite to prove that "Natural Language to DAG" was actually reliable.

### 🏛️ THE MERGER: ZERAK
Zerak is where these two journeys meet. The reliability of structured Fullstack engineering meets the generative power of AI. It’s not just a wrapper; it’s an engine that **validates**, **orchestrates**, and **benchmarks** AI-generated intent.

---

## 2. 🧾 PROJECT OVERVIEW

### PROBLEM STATEMENT
Traditional automation platforms have a high barrier to entry. Users must understand:
1.  **Node Schemas**: What does the Slack node need?
2.  **Data Mapping**: How do I pass the results of an HTTP request to a Gmail node?
3.  **Logical Flow**: How do I build an IF-branch without breaking the system?

### SOLUTION: ZERAK
Zerak allows users to express intent in natural language. The system then:
1.  **Generates** a valid DAG based on allowed node types.
2.  **Validates** the structure for cycles and missing dependencies.
3.  **Executes** the workflow durably using an event-driven engine.

### THE PITCHES
*   **60-Second (Elevator)**: "Zerak is an AI-native automation platform. While Zapier and n8n require manual mapping, Zerak uses a specialized LLM pipeline to generate fully functional, validated workflows from natural language. It’s built on a durable event-driven engine that ensures your automations never fail silently."
*   **2-Minute (Technical)**: "I built Zerak to solve the 'Mapping Problem' in automation. It uses a Next.js App Router frontend with React Flow for visualization. The core is an Inngest-powered orchestration engine that executes Directed Acyclic Graphs (DAGs). The AI layer isn't just a helper; it emits structured JSON chunks that our engine parses, re-maps for DB safety, and evaluates against a custom-built Vitest benchmark suite to ensure accuracy."

---

## 3. 🏗️ SYSTEM ARCHITECTURE (THE "BIG PICTURE")

### HIGH-LEVEL DESIGN
Zerak is a **Distributed Workflow Engine** built with:
*   **Frontend**: Next.js 15, Tailwind CSS, **React Flow**, **Jotai**.
*   **API**: **tRPC** for end-to-end type safety.
*   **Database**: **PostgreSQL** (Neon/Neon Serverless) via **Prisma ORM**.
*   **Orchestration**: **Inngest** (for Durable execution and queuing).
*   **AI Engine**: Vercel AI SDK, Mistral/Gemini/Anthropic/OpenAI.

### THE DATA FLOW (END-TO-END)
1.  **User Input**: "Fetch my orders from Google Sheets and summarize them with AI."
2.  **Streaming Generation**: An Edge function calls the LLM with `STREAMING_SYSTEM_PROMPT`. The LLM emits JSON chunks (`intent` -> `plan` -> `nodes` -> `connections`).
3.  **Heuristic Normalization**: The `ensureGeneratedWorkflow` utility fixes missing triggers or disconnected edges.
4.  **Persistence**: The workflow is saved to Postgres.
5.  **Trigger**: User hits "Run" or a Webhook/Cron fires.
6.  **Orchestration**: Inngest fetches the workflow, performs a **Topological Sort**, and begins execution.
7.  **Durable Steps**: Each node execution is an Inngest "Step," persisting state and handling retries automatically.

---

## 4. 🗄️ DATA ACCESS LAYER (RELATIONAL RIGOR)

### SCHEMA DESIGN
We use a **Strict Relational Model** to prevent "orphan nodes" or "broken edges."
*   **Workflow**: Container for the automation logic.
*   **Node**: Stores the specific configuration (`NodeType`) and `Json` data fields.
*   **Connection**: Explicitly defines edges (`fromNodeId` -> `toNodeId`).
*   **Execution**: Maintains a JSON log of node outputs and timings for auditability.

### WHY POSTGRESQL + PRISMA?
*   **Referential Integrity**: Many-to-one relationships between Nodes and Workflows must be strict. If a workflow is deleted, `onDelete: Cascade` ensures the database stays clean.
*   **Transaction Safety**: We can use Prisma Transactions to ensure that when a workflow is "Updated," the old nodes are deleted and new ones created atomically.
*   **Trade-off**: NoSQL would be easier for the "Node Data" JSON, but Postgres's JSONB field gives us the best of both worlds—flexible data storage with relational structural safety.

---

## 5. 🔐 AUTH & IDENTITY CONTROL

### IMPLEMENTATION
*   **Framework**: **better-auth**.
*   **Security**: Uses standard session-based auth with CSRF protection.
*   **Integration Identity**: We leverage **OAuth Scopes** via the `Account` table. When a user connects Google, we request granular scopes for Drive, Sheets, and Gmail.
*   **Isolation**: Every database query is scoped by `userId`. We never rely on client-side IDs; the session on the server dictates resource access.

---

## 6. 🎨 THE CANVAS LAYER (FRONTEND)

### VISUALIZER: REACT FLOW
*   **Why**: React Flow is the industry standard for node-based UIs. It allows us to render the DAG dynamically as the AI generates it.
*   **Customization**: Every node type (`HTTP`, `AI`, `Gmail`) has a custom UI component in `src/features/editor/components/nodes`.

### STATE: JOTAI (ATOMIC STATE)
*   **Why**: Standard React state (useState) causes massive re-renders in a complex canvas.
*   **Implementation**: We use "Atoms" for `nodes` and `edges`. When the LLM streams a chunk, we only update the specific atoms, keeping the UI smooth even during high-throughput generation.

---

## 7. 🤖 NLP → WORKFLOW ENGINE (DEEP DIVE)

### THE CHALLENGE: LLM UNRELIABILITY
LLMs frequently hallucinate. They might:
1.  Forget to add a Trigger node.
2.  Forget to connect Node A to Node B.
3.  Output malformed JSON.

### SOLUTION: HEURISTIC NORMALIZATION (`ensureGeneratedWorkflow`)
I built a specialized processing layer:
*   **Trigger Enforcement**: If the AI omits a trigger, we automatically inject a `MANUAL_TRIGGER`.
*   **Auto-Linking**: If the AI outputs nodes sequentially but omits "connections," our logic automatically builds a linear chain based on the order of generation.
*   **Partial Parsing**: We use a custom parser that can handle JSON even if it’s currently being streamed and hasn't closed its brackets yet.

### SOLUTION: ID REMAPPING
The AI generates generic IDs like "node-1." If we saved these, we'd have collisions.
*   **Logic**: Before saving, the `remap-generated-workflow-ids` utility replaces temp IDs with secure, unique CUIDs, updating all connection references simultaneously.

---

## 8. 🔄 ORCHESTRATION & INNGEST LAYER

### DURABLE EXECUTION
Inngest is the heart of Zerak. Unlike `setTimeout` or simple `async` functions:
*   **Step-Level Persistence**: If a workflow has 10 steps and fails on step 9, Inngest knows EXACTLY where it stopped. It doesn't rerun steps 1-8.
*   **Automatic Retries**: We configure exponential backoff for flaky APIs (HTTP requests).

### TOPOLOGICAL SORTING
We don't execute nodes in the order they are in the database.
*   **Implementation**: We use the `toposort` library in `src/app/inngest/utils.ts`. 
*   **The Logic**: We build a directed graph from connections. Toposort returns a linear array where every node appears only *after* all its dependencies have run.

### BRANCHING & LOOPING
*   **IF Nodes**: The executor evaluates a condition. It then marks the "untaken" path's nodes as `skipped` in the context, ensuring the engine doesn't execute them.
*   **LOOP Nodes**: Currently implemented as a sequential iterator. It takes an array from the context, and for each item, it triggers a sub-execution of the loop body nodes.

---

## 9. ⚙️ EXECUTOR REGISTRY PATTERN

### THE ARCHITECTURE
We use a **Registry Pattern** located in `src/features/executions/lib/executor-registry.ts`.
*   **Why**: It makes the system infinitely extensible. Adding a "Slack" node is as simple as adding a key to the registry and writing one executor function.
*   **Interface**: Every executor follows the `NodeExecutor` type: `(data, context, step) => Promise<Result>`.

---

## 10. 🧠 DATA FLOW & CONTEXT RESOLUTION

### THE CONTEXT OBJECT
During execution, we maintain a `context` object. 
*   **Storage**: Every node's output is saved under `context[nodeVariableName]`.
*   **Format**: `context.myHttpRequest.httpResponse.data`.

### RUNTIME RESOLUTION (`template.ts`)
*   **Logic**: Before a node runs, its configuration strings are processed by **Handlebars**.
*   **Example**: `Hello {{authNode.user.name}}` is resolved by looking up the `authNode` key in the context.
*   **Safety**: We use `html-entities` decoding to ensure that user inputs in the context don't break the templates.

---

## 11. ✅ VALIDATION & STRUCTURAL ANALYSIS

### CYCLE DETECTION
A workflow with a cycle (A -> B -> A) will crash a standard engine.
*   **Implementation**: Our `topologicalSort` catches cycles before execution begins. If a cycle is detected, the run is aborted with a clear "Recursive Loop Detected" error.

### DATA VALIDATION
We use **Zod** to validate node data before they are saved. This ensures that an "Email" node always has a `to` and `subject` field, preventing runtime crashes.

---

## 12. 🧪 BENCHMARKING & EVALUATION METRICS

### WHY BENCHMARK?
"It works for me" isn't enough for AI. 
*   **Dataset**: I built a `prompts.json` containing human-written "Golden Workflows."
*   **The Engine**: `evaluate-nlp.ts` runs the generator against 100+ prompts.

### METRICS
*   **Node F1-Score**: Measures how well the AI selected the correct node types.
*   **Edge Accuracy**: Measures if the logical flow (connections) matches the intent.
*   **Token Efficiency**: Tracks cost vs. accuracy to find the most efficient models.

---

## 16. 💻 HARD PROBLEMS & SOLUTIONS

### PROBLEM: THE "HALTING" STREAM
**The Issue**: During generation, an LLM might need clarification. 
**Solution**: I implemented a **Question Chunk** protocol. The AI can stop mid-DAG, emit a `{"type":"question"}` chunk, and wait for user input. The context is then updated and the generation resumes. This turned a "one-shot" generation into a **Conversational Workflow Builder**.

---

## 18. ❓ INTERVIEW QUESTION MASTERCLASS (25+ Qs)

### ARCHITECTURE & DESIGN
1.  **Q: Why use Inngest over a simple queue like BullMQ?**
    *   **A**: BullMQ manages jobs; Inngest manages **Stateful Workflows**. In Zerak, we don't just want to "run a task"; we want to pause execution, wait for triggers, handle multi-step retries, and maintain a context across nodes. Inngest provides "Durable Execution" without needing to manage a complex state machine manually.
2.  **Q: How do you handle circular dependencies in the DAG?**
    *   **A**: We use Kahn’s Algorithm (via `toposort`). If the algorithm fails to find a linear ordering, it means a cycle exists. We catch this at the "Validation" stage and prevent the workflow from ever starting.
3.  **Q: Why standard SQL for node data instead of a Document DB?**
    *   **A**: Relationships. The structural integrity of the "Workflow -> Nodes -> Connections" graph is more important than the flexibility of node data. We use PostgreSQL's `JSONB` for the data fields, giving us NoSQL flexibility within a rigid relational structure.

### AI & NLP
4.  **Q: How do you handle LLM "Hallucinations" in the workflow connections?**
    *   **A**: We use **Constrained Output** and **Heuristic Patching**. The system prompt explicitly defines the connection schema. If the AI still fails, our `ensureGeneratedWorkflow` logic detects "islands" (nodes with no connections) and automatically bridges them into a linear chain.
5.  **Q: Explain the "Streaming Chunk" protocol.**
    *   **A**: We don't wait for the LLM to finish. We emit a sequence of JSON objects: `intent`, `plan`, `partial_nodes`, and `final`. This allows the UI to render the "Thought Process" and the "Work-in-Progress" DAG, reducing perceived latency.

### DATA FLOW & SECURITY
6.  **Q: How do you prevent a malicious user from running harmful code in the CODE node?**
    *   **A**: *Current*: Restricted environment. *Future (Scaling)*: We would move execution to a **V8 Isolate** or a **Docker Sandbox** with zero network access and strict CPU/Memory limits.
7.  **Q: How are variables passed safely between nodes?**
    *   **A**: We use a `resolveTemplate` utility with Handlebars. It performs path-based lookups in a curated `context` object. It’s essentially a "read-only" data pipeline where nodes can only read previous outputs.

### SCALABILITY & PERFORMANCE
8.  **Q: How would you scale this to handle 10,000 parallel workflows?**
    *   **A**: Since our engine is serverless (Inngest + Vercel), scaling is mostly handled at the infrastructure level. However, we would need to optimize the **Database Connection Pool** (using Prisma Accelerate or PgBouncer) and implement **Concurrency Limits** per user to prevent one tenant from hogging the engine.
9.  **Q: What is the bottleneck of the system?**
    *   **A**: LLM Latency and Token Limits. Generation takes 5-10 seconds. We mitigate this with **Streaming UI** to keep the user engaged.

---

## 19. 🎥 DEMO SCRIPT: THE "PRO" WALKTHROUGH

**Scene**: A user wanting to automate an "AI-Powered Lead Researcher."

1.  **The Prompt**: "Find my new leads in Google Sheets, research their company using Mistral AI, and send a summary to my Slack."
2.  **The Magic**: Note how Zerak identifies the `GOOGLE_SHEETS` node first. It doesn't just "guess"; it knows it needs a trigger.
3.  **The Execution**: "I click 'Generate'. Look at the screen—the nodes are appearing in real-time. Notice how it automatically mapped `{{googleSheets.row.company}}` into the Mistral prompt. That is the **Context Layer** at work."
4.  **The Result**: "I hit run. We can track the status node-by-node. Green means success. In 30 seconds, we built what would take 20 minutes in Zapier."
5.  **Closing**: "That is Zerak: AI-Native, Durable, and Validated."
