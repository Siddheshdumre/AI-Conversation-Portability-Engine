# AI Conversation Portability Engine

A powerful, full-stack Next.js engine designed to solve the problem of AI platform lock-in. This true "portability engine" allows developers, researchers, and power users to import massive, multi-page AI conversations (e.g., from ChatGPT), extract the core structural memory using LLMs, and export that context perfectly formatted to continue the conversation in any other model (like Gemini or Claude) without losing context.

---

## 🚀 The Problem It Solves

When you spend weeks building software architecture, brainstorming business strategies, or plotting a novel with ChatGPT, you generate a massive amount of "implicit context"—decisions made, code written, and assumptions established. 

Currently, there is no standardized way to move this context to a competitor model (like Google Gemini 1.5 Pro or Anthropic Claude 3.5 Sonnet) if you hit a paywall, rate limit, or just want a second opinion. Copy-pasting 50 pages of raw chat logs destroys the new model's context window with useless conversational filler ("Certainly! I can help you with that...").

**The AI Conversation Portability Engine fixes this.**

By ingesting the raw conversation and running it through a sophisticated Memory Extraction pipeline, it identifies the *actual* value of the conversation and compresses it into a highly dense, structured memory block. You can then inject this block into any new AI, instantly catching it up to speed on weeks of prior work at a fraction of the token cost.

---

## ✨ Core Features

### 1. Universal Headless Ingestion (`lib/fetcher.ts`)
Bypasses Cloudflare anti-scraping protections to silently extract the raw conversation graph (`__NEXT_DATA__` and Remix contexts) directly from a public ChatGPT share link using a pre-compiled Vercel-optimized Puppeteer/Chromium instance.

### 2. High-Fidelity Memory Extraction (`lib/extractor.ts`)
Uses **Groq (Llama 3.3 70B)** (optimized for deterministic JSON output and blistering speed) to read the entire conversation and extract a strict JSON `StructuredMemory` schema containing:
*   **Overview**: Executive summary.
*   **Topics**: Core themes discussed.
*   **Decisions**: Immutable choices made during the chat.
*   **Important Points**: Facts establish.
*   **Code References**: Specific files, libraries, or algorithms mentioned.
*   **Assumptions**: Implicit context the new AI needs to know.
*   **Action Items**: Unresolved tasks to continue working on.

### 3. Smart Code Block Tracking (`lib/code-extractor.ts`)
Automatically runs a secondary regex-based parsing pass over the raw chat HTML to preserve, deduplicate, and highlight raw code snippets, ensuring technical context is never lost to AI summarizing.

### 4. Dynamic Token Compression (`lib/compressor.ts`)
Features a 3-tier export system (Compact, Balanced, Detailed) that formats the extracted JSON into targeted prompts optimized specifically for the quirks of GPT, Claude, or Gemini system prompts. Includes a real-time token estimator to guarantee you never blow out a context window limits.

### 5. Intelligent Chunk Synthesis (`lib/merger.ts`)
For conversations exceeding 100k tokens, the engine chunks the conversation, extracts memory in parallel, and then uses a highly deterministic secondary LLM pass (Chain of Thought reasoning) to safely deduplicate and synthesize the arrays into a coherent master memory without losing unique technical details.

---

## 🏗️ Architecture

The project is built on the **Next.js 14 App Router** paradigm, leaning heavily on serverless architecture for incredible scale at zero cost.

*   **Framework:** Next.js 14 (React 18)
*   **Language:** TypeScript (Strict Mode)
*   **Styling:** Tailwind CSS
*   **Browser Automation:** Puppeteer Core + Sparticuz Chromium (Serverless-Ready)
*   **AI Engine Layer:** `groq-sdk` (Llama 3.3 70B Versatile)
*   **Parsing:** Cheerio (HTML), Custom AST regex tools
*   **Hosting:** Optimized for Vercel Serverless Functions

### Infrastructure Pipeline
1.  **Client Post:** User pastes a link into the UI.
2.  **Serverless Scrape:** `/api/import` triggers headless Chromium to render the heavy React page and dump the JSON state.
3.  **Token Analysis:** The engine evaluates token counts (`lib/tokenizer.ts`) to determine if the chat requires single-pass or chunked extraction.
4.  **LLM Processing:** Groq's Llama 3.3 70B processes the messages against a strict JSON extraction schema using a structured reasoning scratchpad.
5.  **Re-hydration:** The structured memory is passed back to the client where React renders the multi-tab analysis dashboard.

---

## 💻 Local Setup & Development

To run the Portability Engine locally on your machine, you need Node.js `v20` or higher.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Siddheshdumre/AI-Conversation-Portability-Engine.git
cd AI-Conversation-Portability-Engine
npm install
```

### 2. Configure Environment Variables
You need a free Groq API key to run the extraction engine.
Create a `.env.local` file in the root directory:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here...
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) with your browser to witness the engine.

---

## 🚢 Deployment (Vercel)

This application is specifically architected to bypass Next.js Vercel Serverless limits when running headless browsers.

1. Fork/Push this repository to your GitHub account.
2. Import the project into the [Vercel Dashboard](https://vercel.com/new).
3. Under **Environment Variables**, add \`GROQ_API_KEY\`.
4. Deploy!

*Notes for Vercel:*
* *The `@sparticuz/chromium` library is configured to dynamically download a pre-compiled Chromium tarball (`v122.0.0`) at runtime in `lib/fetcher.ts` to stay significantly under Vercel's 50MB Serverless Function limits.*
* *The `/api/import` route uses \`export const maxDuration = 60;\` specifically to prevent Vercel's default 10-second Hobby timeout from killing Puppeteer and Groq API calls prematurely.*

---

## 🛣️ Roadmap

- **Syntax-Aware Smart Chunking:** Implementing an algorithm that guarantees markdown code blocks (`\x60\x60\x60`) are never severed across API calls during massive conversation processing.
- **Universal Adapters:** Adding native support for parsing Anthropic Claude standard exports via JSON upload.
- **Direct-to-Brain Syncing:** Integrating OAuth to allow users to sync structured memories directly into Notion Databases or Obsidian Vaults.
- **Auth & Database State:** Moving from stateless sessions to persistent user accounts using Clerk and Supabase pgvector.

---

## 📄 License
MIT License - open sourced for the benefit of the community to fight AI platform lock-in.
