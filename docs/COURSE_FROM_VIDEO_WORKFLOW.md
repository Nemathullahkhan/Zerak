# Course-from-Video Workflow: Implementation Plan

This doc describes how to implement a **“create sellable course from YouTube/Coursera link or file”** workflow using the current AI automation platform.

---

## 1. Your Workflow (Goals)

- **Input:** YouTube link, Coursera link, or downloaded file (video/transcript/slides).
- **Output:** A new course with:
  - Same (or simplified) subject matter
  - Redrawn figures (not copied)
  - New voiceover (AI or your own recording)
- **Use case:** Sell on Coursera, Udemy, or your own app.

---

## 2. Current Codebase (Relevant Parts)

| Area | What exists |
|------|-------------|
| **Workflows** | DAG of nodes; stored in Postgres (Workflow, Node, Connection). |
| **Editor** | React Flow canvas; add nodes from `node-selector`, configure in dialogs. |
| **Execution** | One Inngest function runs the DAG in topological order; each node has an **executor** that reads/writes a shared **context**. |
| **Nodes** | Triggers (Manual, Google Form, Stripe); Execution (HTTP Request, Gemini). No video/transcript/course nodes yet. |
| **Registry** | `executor-registry.ts` maps `NodeType` → executor; `node-components.ts` maps type → React component. |
| **Realtime** | Each node type can have an Inngest realtime channel for loading/success/error in the UI. |

So the platform is a **generic DAG executor with context**. A “course from link/file” flow fits as **new node type(s) + executor(s)** that produce/consume that context.

---

## 3. AI Tools That Do the Heavy Lifting

None of these are “one click + YouTube link → full course” in a single product; you’ll combine **transcript/content extraction** with **course generation / video / voice**. Your platform can **orchestrate** these via new nodes (e.g. HTTP or dedicated integrations).

| Tool | What it does | How you’d use it |
|------|----------------|------------------|
| **LearnLens Studio** | Courses from YouTube: extract segments, structure, notes, quizzes. | API/URL input → structured course content; use in a “Course from URL” node. |
| **Massar App** | YouTube → interactive course (lessons, quizzes, progress, certs). | Similar: feed URL or transcript; get course structure + content. |
| **Synthesia** | AI avatars + voiceovers, from prompts/docs/URLs; 29+ languages. | “Script/slides in context” → generate video with new visuals/voice. |
| **Wavel AI / HeyGen** | Script/slides/URL → narrated video, avatars, voice cloning. | Same idea: your workflow produces script/outline → call their API for final video. |

Practical split:

1. **Extract:** YouTube/Coursera transcript (or parse file) → text + optional timestamps.
2. **Structure:** Use your existing **Gemini** (or new “Course outline” node) to turn transcript into: outline, lesson titles, key points, “redraw these figures” briefs.
3. **Generate:** Send outline/script to **Synthesia / Wavel / HeyGen** (or similar) for video + new voice/figures; or you record voice and only use them for visuals.

Your app’s job: **workflow nodes** for (1) and (2), and optionally (3) via **HTTP Request** or a dedicated “Video generator” node that calls one of these APIs.

---

## 4. How to Implement in This Codebase

### 4.1 New node types (choose one of these designs)

**Option A – Minimal (recommended to start)**  
- **`CONTENT_SOURCE`** – Input: YouTube/Coursera URL or “file path/URL” (e.g. S3 or internal URL). Output in context: `transcript`, `title`, `sourceType`, optional `chapters`.  
- Reuse **Gemini** (and maybe **HTTP Request**) for the rest: e.g. “from transcript → course outline”, “from outline → script”, then HTTP to Synthesia/HeyGen.

**Option B – Explicit course pipeline**  
- **`CONTENT_SOURCE`** – same as above.  
- **`COURSE_OUTLINE`** – Reads `transcript` from context; uses Gemini (or dedicated API) to produce structured outline (modules, lessons, key points, figure descriptions). Writes `courseOutline` to context.  
- **`VIDEO_GENERATOR`** – Reads `courseOutline` (and maybe script); calls external API (Synthesia/HeyGen/etc.) to generate video; writes `videoUrl` or `assetId` to context.  
- **HTTP Request** – For any other API (e.g. transcript service, asset storage).

**Option C – Single “Course from URL” node**  
- One node that: fetches transcript → calls AI → optionally calls video API. Faster to ship, but less flexible in the editor (fewer steps to reuse elsewhere).

Recommendation: implement **Option A** first (one new node: **Content Source**), then add **Course outline** (Gemini with a fixed “course structuring” prompt) and **HTTP Request** to an external video API as needed.

---

### 4.2 Implementation checklist

#### Step 1: Content Source node (YouTube/Coursera/file)

1. **Prisma**  
   - Add to `NodeType` enum, e.g.:  
     `CONTENT_SOURCE`  
   - Run migration.

2. **Executor** (`src/features/executions/components/content-source/executor.ts`)  
   - **Input (from `data`):**  
     - `variableName` (required)  
     - `sourceType`: `youtube` | `coursera` | `file_url`  
     - `url` or `filePath` (for file: could be internal URL after upload)  
   - **Logic:**  
     - If YouTube: use YouTube Transcript API or a third-party transcript API (e.g. RapidAPI, or backend that uses `youtube-transcript` package).  
     - If Coursera: use official API if you have access, or a scraping/transcript service (respect ToS).  
     - If file: fetch from URL or read from disk/S3; if it’s video, use a transcript API; if it’s PDF/doc, extract text.  
   - **Output:**  
     - `context[variableName] = { transcript, title, sourceType, chapters? }`.  
   - **Realtime:**  
     - `publish(contentSourceChannel().status({ nodeId, status }))` for loading/success/error.  
   - **Credentials:**  
     - Store API keys in env or your credentials system; executor reads them like Gemini does.

3. **Editor UI**  
   - **Node component** (`content-source/node.tsx`): small card showing “Content Source”, optional icon (e.g. link/video).  
   - **Dialog** (`content-source/dialog.tsx`): form for `variableName`, `sourceType`, `url`/`filePath`.  
   - **Actions** (`content-source/actions.ts`): if you have a shared pattern (e.g. “Open config”), reuse it.  
   - Register in `config/node-components.ts` and in **node-selector** under a new section, e.g. “Content” or “Course creation”.

4. **Inngest**  
   - Add `contentSourceChannel` in `src/app/inngest/channels/content-source.ts` (same pattern as `gemini.ts`).  
   - Add `contentSourceChannel()` to `execute-workflow`’s `channels` in `api/inngest/functions.ts`.  
   - Register executor in `executor-registry.ts` for `NodeType.CONTENT_SOURCE`.

5. **Dependencies**  
   - For YouTube: e.g. `youtube-transcript` (or a small server route that returns transcript).  
   - For file: use existing HTTP or add a simple “upload + return URL” so the node receives a URL.

#### Step 2: Course outline (reuse or new node)

- **Reuse Gemini:**  
  - Add another Gemini node downstream of Content Source.  
  - **userPrompt:** e.g. “Based on this transcript: {{contentSource.transcript}}, produce a structured course outline: modules, lessons, key points, and short descriptions of figures to redraw.”  
  - **variableName:** e.g. `courseOutline`.  
- **Or** add a dedicated **`COURSE_OUTLINE`** node that wraps the same Gemini call with a fixed system prompt (e.g. “You are a curriculum designer…”).  
- No new node type is strictly required; the main enabler is **Content Source** putting `transcript` (and maybe `title`) into context.

#### Step 3: Video / voice (figures + voiceover)

- **Option 1 – External API (Synthesia / Wavel / HeyGen)**  
  - Use **HTTP Request** node: POST outline/script to their API; store returned `video_url` or `job_id` in context.  
  - Optional dedicated **Video generator** node that reads `courseOutline` (and script), builds request body, calls API, writes result to context.  

- **Option 2 – Your own recording**  
  - Workflow produces: outline, script, list of “figures to redraw”.  
  - You record voice and redraw figures manually; upload final assets.  
  - A final node could “package” course (e.g. write to DB or S3) for Coursera/Udemy/your app.

#### Step 4: Persistence (optional)

- If you want to **store** generated courses for “my courses” or export:  
  - Add Prisma models, e.g. `Course`, `CourseModule`, `CourseLesson`, `CourseAsset` (video URL, script, figure briefs).  
  - In the workflow, add a node (or tRPC mutation) that writes to these tables from context (e.g. when “Video generator” or “Package course” runs).  
- Execution table: you don’t have one today; if you want “run history” per workflow, add an `Execution` model and write to it at the start/end of `execute-workflow`.

---

### 4.3 Example workflow in the editor

1. **Manual Trigger** (or **Google Form** if you collect “course URL” from a form).  
2. **Content Source** – `sourceType: youtube`, `url: "https://youtube.com/watch?v=..."`, `variableName: "source"`.  
3. **Gemini** – `userPrompt`: “Turn this into a course outline with modules and figure descriptions: {{source.transcript}}”, `variableName: "courseOutline"`.  
4. **HTTP Request** – POST to Synthesia/HeyGen with `{{courseOutline}}` (or a simplified script); store `videoUrl` in context or in your DB.  
5. (Optional) **Custom node or tRPC** – Save course to `Course` table for your app/Coursera/Udemy.

---

## 5. Summary

| What you want | How it fits the codebase |
|---------------|---------------------------|
| “Best” courses from YouTube/Coursera/file | **Content Source** node extracts transcript; you can rank/filter “best” by metadata or run multiple workflows. |
| Same audio or easier explanation | **Gemini** (or Course outline node) rewrites/simplifies from transcript; optional TTS or your recording. |
| Redrawn figures | Outline from Gemini includes “figure descriptions”; you send those to Synthesia/HeyGen (or similar) or to a figure-generation API. |
| Sell on Coursera/Udemy/own app | Workflow outputs structured course + video URL; add **persistence** (Course model) and export/upload steps (HTTP or internal API). |

**Suggested AI tools to integrate (via HTTP or dedicated node):**  
- **Transcript:** YouTube Transcript API / `youtube-transcript` / third-party.  
- **Structure + script:** Your existing **Gemini** in the workflow.  
- **Video + new voice/figures:** **Synthesia**, **Wavel AI**, or **HeyGen** (API).  

Start with: **Content Source node** (URL/file → transcript in context) + **Gemini** (transcript → course outline/script) + **HTTP Request** (to one video API). Then add a **Video generator** node and **Course** persistence if you need a smoother UX and storage.
