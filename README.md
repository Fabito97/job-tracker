# Job Application Tracker

An intelligent, full-stack job application tracker designed to scrape postings, analyze and score them against candidate resumes using AI, detect geographical hiring restrictions, and streamline the application and interview pipeline.

- **Backend**: .NET 10 Minimal API, EF Core, SQLite, OpenAI SDK (Multi-provider compatible: Gemini, Groq, OpenAI, Ollama/Local)
- **Frontend**: React 19, Vite, Tailwind CSS v4, TanStack Query, Lucide Icons

---

## Key Features

### 1. Multi-Provider AI Engine & Dynamic Settings
- **Supported Providers**: Google Gemini (default `gemini-2.5-flash`), Groq (`llama-3.3-70b-versatile`), OpenAI (`gpt-4o-mini`), and Custom/Local endpoints (Ollama, vLLM).
- **Masked API Keys**: API keys are securely saved locally in `settings.json`, masked in UI responses (e.g. `AIza...4X9Q`), and can be switched dynamically per provider without server restarts.
- **Dynamic Prompt Composer**: Programmatically constructs analysis prompts injecting candidate headline, seniority level, physical residence, target locations, work authorization, clearance, and custom dealbreakers.
- **Hot-Reloading Prompt Templates**: `PromptStore` tracks file timestamps (`LastWriteTimeUtc`) with in-memory caching, so edits to prompt templates (`TailoredResumePrompt.txt`, `CoverLetterPrompt.txt`, etc.) take effect immediately on disk without needing server restarts.

### 2. Candidate Profile & Location Eligibility
- **Location Categorization**:
  - **Scrape Search Location**: Query parameter sent to external job boards when scraping (e.g. searching for `"Remote"`).
  - **Current Physical Residence** (`CurrentLocation`): Physical country of residency for payroll & tax clearance (e.g. `"Nigeria"`, `"Canada"`).
  - **Target Locations & Markets** (`TargetLocations`): Aspirational regions (e.g. `["Remote", "Worldwide", "United States", "United Kingdom"]`).
- **Location Eligibility Checks**: The AI analyzes job postings—especially remote roles—to verify if they actually allow hiring from the candidate's physical country or have hidden territorial restrictions (e.g. "US Remote Only", "Must reside in EMEA").
- **Detailed Location Feedback**: Displays color-coded badges (`Eligible`, `Ineligible`, `Conditional`) and notes in the detail panel alongside visa sponsorship breakdowns.
- **Custom Dealbreakers & Clearances**: Configure custom disqualification rules and government clearance checks.

### 3. Flexible Job Import (Dual Mode)
Import jobs easily using either:
- **Direct Form**: Enter a single job posting manually (`Job Title`, `Company`, `Job URL`, `Description`, `Location`, `Date`) with instant validation and import.
- **Batch JSON Upload**: Switch seamlessly via the dropdown menu to upload a JSON file containing single or batch job records (fully backward-compatible with scraped lists).

### 4. Client-Side Job Board Scraper
- Built-in scraper supporting popular job boards (Dice, Indeed, LinkedIn, Remotive, Jobicy, etc.).
- Configurable search parameters: board type, keywords, search location, max jobs, company tokens, and experience level.
- Preview and cherry-pick scraped jobs directly into the tracking pipeline.

### 5. Dedicated Resume Management & Standardized Storage
- **Dedicated Resume Modal**: Accessible directly from the main navigation (separate from settings) to upload and manage candidate resumes (`.pdf` and `.txt`).
- **Predictable Seed Discovery**: On cold boot, discovers seed files following the `cv_<role>.txt` pattern (e.g. `cv_backend.txt` $\rightarrow$ "Backend", `cv_full_stack.txt` $\rightarrow$ "Full Stack") and automatically seeds them into SQLite.
- **Standardized Storage on Upload**: When a user uploads a resume file with any arbitrary name (`My_Final_CV_2026.pdf`), it is normalized on disk to `cv_<role>_<guid>.<ext>` while preserving the original name in the database and UI.
- **Dynamic Selection**: Switch primary/default resume versions anytime for targeted AI job matching.

### 6. Tailoring Directives & Adaptive Summary
- **Adaptive Professional Summary**:
  - `JobAnalysis.TailoredSummary` provides an immediate 3–4 sentence elevator pitch upon import.
  - When tailoring/refining a resume, `TailoredResume.Summary` evaluates user notes and confirmed skills to preserve, lightly polish, or adjust the summary to align with specific directives.
  - The UI and clipboard exports automatically prioritize the refined tailored summary with graceful fallback to the analysis summary.
- **AI Tailored Resumes**: Rewrites and aligns resume bullets specifically to the target job description while strictly avoiding hallucinated credentials.
- **Tailoring Directives**: Add bespoke instructions (e.g., "Highlight AWS Lambda and microservices; keep tone concise") saved per job to steer the AI generator.
- **Confirmed Missing Skills**: Interactive badges allowing you to confirm skills flagged as missing to automatically integrate them into the tailored output.
- **Cover Letter Generation**: Creates role-specific cover letters aligned with the matched resume version.
- **One-Click Export / Copy**: Quick copy buttons for tailored summaries, competencies, bullet points, or the full resume.

---

## Project Structure

```
├── backend/
│   ├── blacklisted.txt cv.txt cv_f.txt              # Shared seed files
│   └── Tracker/
│       ├── Domain/Models/                           # Job, JobAnalysis, CandidateProfile, Resume, TailoredResume
│       ├── Features/                                # Endpoints & DTOs (Jobs, Settings, Resumes, Scraper)
│       ├── Infrastructure/                          # EF Core DbContext, AI Services, PromptComposer, PromptStore
│       └── Prompts/                                 # TailoredResumePrompt.txt, RefineTailoredResumePrompt.txt, CoverLetterPrompt.txt
├── frontend/
│   └── src/
│       ├── components/                              # JobTable, JobDetailPanel, SettingsModal, ResumeModal,
│       │                                            # ImportModal, ScrapePanel, MetricCards
│       ├── hooks/                                   # TanStack Query mutation & query hooks
│       └── types.ts                                 # Shared TypeScript interfaces & models
├── LICENSE.md
└── README.md
```

---

## Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 20+](https://nodejs.org/) and `npm`

### 1. Backend Setup

```bash
cd backend/Tracker

# (Optional) Initialize user secrets or set your API key
dotnet user-secrets init
dotnet user-secrets set "Gemini:ApiKey" "your-gemini-key" # or configure directly in the UI!

# Run the API
dotnet run
```
The backend starts at `http://localhost:5116` (or `https://localhost:7116`).
- Automatically initializes `tracker.db` SQLite database on first run.
- **Smart Startup**: Automatically checks `db.Database.GetPendingMigrations().Any()` before migrating, avoiding table lock contention on subsequent runs.
- Automatically seeds default resumes from template files matching `cv_<role>.txt` if the database is fresh.

> **Tip:** You do not need to configure API keys in configuration files manually. You can launch the app and configure your keys (Gemini, Groq, OpenAI) directly in the **Settings** modal in the UI.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend is available at `http://localhost:5173`.

---

## Import JSON Schema

When importing via JSON (either through file upload or API), the payload accepts a list or single object of scraped jobs:

```json
[
  {
    "jobTitle": "Senior Full Stack Engineer",
    "company": "Acme Corp",
    "location": "Remote - Worldwide",
    "jobUrl": "https://example.com/jobs/12345",
    "jobDescription": "Full text of the job description...",
    "date": "Today"
  }
]
```

- **Required**: `jobTitle`, `company`, `jobUrl`, `jobDescription` (or `description`).
- **Optional**: `location`, `date` (`Today`, `Yesterday`, `3 days ago`, or ISO dates), `jobBoard`.

---

## API Reference Overview

| Method | Route | Description |
| --- | --- | --- |
| **GET** | `/api/settings` | Retrieve active AI provider, model, masked keys, candidate profile, and blacklist |
| **PUT** | `/api/settings` | Update AI provider, model, API keys, candidate profile, and criteria |
| **GET** | `/api/resumes` | List saved resumes and active primary resume |
| **POST** | `/api/resumes` | Upload a new `.pdf` or `.txt` resume version (standardized to `cv_<role>_<guid>.<ext>`) |
| **PUT** | `/api/resumes/{id}/primary` | Set active primary resume for analysis |
| **DELETE** | `/api/resumes/{id}` | Delete a resume record and its file on disk |
| **POST** | `/api/jobs/import` | Analyze, score, and store job postings (batch or single) |
| **GET** | `/api/jobs` | Paginated job list filtered by status, board, min score, date, and query |
| **GET** | `/api/jobs/{id}` | Full job details including description and AI analysis |
| **PATCH** | `/api/jobs/{id}/status` | Update tracking state (`Applied`, `Interviewing`, dates, notes) |
| **PATCH** | `/api/jobs/{id}/directives`| Update per-job tailoring directives and confirmed skills |
| **POST** | `/api/jobs/{id}/resume` | Generate or regenerate tailored resume with directive-aware summary |
| **POST** | `/api/jobs/{id}/cover-letter` | Generate or regenerate cover letter |
| **POST** | `/api/scrape` | Trigger client-side / board scraper |

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.


