# Job Application Tracker

An intelligent, full-stack job application tracker designed to scrape postings, analyze and score them against candidate resumes using AI, detect geographical hiring restrictions, and streamline the application and interview pipeline.

- **Backend**: .NET 10 Minimal API, EF Core, SQLite, OpenAI SDK (Multi-provider compatible: Gemini, Groq, OpenAI, Ollama/Local)
- **Frontend**: React 19, Vite, Tailwind CSS v4, TanStack Query, Lucide Icons

---

## Key Features

### 1. Multi-Provider AI Engine & Dynamic Settings
- **Supported Providers**: Google Gemini (default `gemini-2.5-flash`), Groq (`llama-3.3-70b-versatile`), OpenAI (`gpt-4o-mini`), and Custom/Local endpoints (Ollama, vLLM).
- **Masked API Keys**: API keys are securely saved locally, masked in UI responses (e.g. `AIza...4X9Q`), and can be switched dynamically per provider without server restarts.
- **Dynamic Prompt Composer**: Injects the active candidate profile, headline, seniority, and dealbreakers into system prompts dynamically.

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

### 5. Dedicated Resume Management
- Dedicated **Resume Modal** accessible from the main navigation (separate from settings).
- Manage multiple resume versions (e.g., General Software Engineering vs. Full-Stack / Specialized).
- Upload `.txt` resumes, preview line counts, inspect extracted keywords, and switch the primary resume anytime.

### 6. Tailoring Directives & Application Assistance
- **AI Tailored Resumes**: Rewrites and aligns resume bullets specifically to the target job description while strictly avoiding hallucinated credentials.
- **Tailoring Directives**: Add bespoke instructions (e.g., "Highlight AWS Lambda and microservices; keep tone concise") saved per job to steer the AI generator.
- **Confirmed Missing Skills**: Interactive badges allowing you to confirm skills flagged as missing to automatically integrate them into the tailored output.
- **Cover Letter Generation**: Creates role-specific cover letters aligned with the matched resume version.
- **One-Click Export / Copy**: Quick copy buttons for tailored summaries, competencies, bullet points, or the full resume.

---

## Project Structure

```
├── backend/
│   ├── blacklisted.txt cv.txt cv_f.txt prompt.txt   # Shared seed files
│   └── Tracker/
│       ├── Domain/Models/                           # Job, JobAnalysis, CandidateProfile, Resume
│       ├── Features/                                # Endpoints & DTOs (Jobs, Settings, Resumes, Scraper)
│       ├── Infrastructure/                          # EF Core DbContext, AI Services, PromptComposer
│       └── Prompts/                                 # AnalysisPrompt.txt, CoverLetterPrompt.txt
├── frontend/
│   └── src/
│       ├── components/                              # JobTable, JobDetailPanel, SettingsModal, ResumeModal,
│       │                                            # ImportModal, ScrapePanel, MetricsCards
│       ├── hooks/                                   # TanStack Query mutation & query hooks
│       └── types.ts                                 # Shared TypeScript interfaces & models
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
The backend starts at `http://localhost:5116` (or `https://localhost:7116`) and automatically sets up `tracker.db` SQLite database on first run.

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
| **POST** | `/api/resumes` | Upload a new `.txt` resume version |
| **PUT** | `/api/resumes/{id}/primary` | Set active primary resume for analysis |
| **POST** | `/api/jobs/import` | Analyze, score, and store job postings (batch or single) |
| **GET** | `/api/jobs` | Paginated job list filtered by status, board, min score, date, and query |
| **GET** | `/api/jobs/{id}` | Full job details including description and AI analysis |
| **PATCH** | `/api/jobs/{id}/status` | Update tracking state (`Applied`, `Interviewing`, dates, notes) |
| **PATCH** | `/api/jobs/{id}/directives`| Update per-job tailoring directives and confirmed skills |
| **POST** | `/api/jobs/{id}/resume` | Generate or regenerate tailored resume |
| **POST** | `/api/jobs/{id}/cover-letter` | Generate or regenerate cover letter |
| **POST** | `/api/scrape` | Trigger client-side / board scraper |

