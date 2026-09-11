# Job Application Tracker

## Merge the two app
Scrapping client side - typescript
AI analysis server side 

One screen for importing job postings, scoring them against your two resume versions, and tracking
every application from pending to offer.

- **Backend**: .NET 10 minimal API, EF Core, SQLite, OpenAI SDK
- **Frontend**: React 19, Vite, Tailwind v4, TanStack Query

## Layout

```
backend/
  blacklisted.txt cv.txt cv_f.txt prompt.txt   shared source files, linked into the API build output
  Tracker/
    Domain/            Job, JobAnalysis, JobStatus
    Features/Jobs/     endpoints, DTOs, service contracts
    Infrastructure/    EF configuration, prompt loading, blacklist, OpenAI and import services
    Prompts/           AnalysisPrompt.txt, CoverLetterPrompt.txt
frontend/
  src/components, src/hooks, src/lib
```

## Running it

The API needs an OpenAI key. Keep it out of source control:

```bash
cd backend/Tracker
dotnet user-secrets init
dotnet user-secrets set "OpenAI:ApiKey" "sk-..."   # or set OPENAI_API_KEY in the environment
dotnet run                                          # http://localhost:5116, creates tracker.db on first run
```

```bash
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

The model is `gpt-5.1` by default and can be changed with `OpenAI:Model` in `appsettings.json`.

## Importing

Click **Import jobs** and pick a `.json` file holding an array of postings:

```json
[
  {
    "jobTitle": "Staff Software Engineer (.Net/C#)",
    "company": "Visa Inc.",
    "date": "Today",
    "location": "Austin, Texas",
    "status": "Pending",
    "jobUrl": "https://www.dice.com/job-detail/0ac14d5c",
    "jobDescription": "Full text of the posting."
  }
]
```

Only `jobTitle`, `company`, `jobUrl` and `jobDescription` are required. `description` works as an alias for
`jobDescription`, and `jobBoard` overrides the board name otherwise derived from the URL.
`date` accepts `Today`, `Yesterday`, `3 days ago`, `30+ days ago` or a real date, and is stored as a
plain date so the date range filter works against the posting date.

Each posting is then either:

| Outcome | Meaning |
| --- | --- |
| Saved | The engine scored it and said to apply |
| Duplicate | The URL is already tracked, or repeated inside the file |
| Blacklisted | The company matches `blacklisted.txt`, checked in code before any AI call |
| Rejected | The engine said not to apply, so it is never stored |
| Failed | The entry was incomplete or the AI call did not return usable JSON |

The engine says not to apply when the score is under 60, the role is outside the United States and not
remote, it needs a security clearance, it is limited to citizens or green card holders, or the employer
states it never sponsors visas. Those rules live in `Prompts/AnalysisPrompt.txt` and can be edited
without recompiling.

## Filters

Tabs are presets that write into the same filter fields shown below them, so the two never disagree.
**Action Needed** is a high match that has not been applied to yet.
Company, job board and the posted date range apply when you press **Search**.

Double click a row, or focus it and press Enter, to open the panel.

## The panel

Beyond the description and the analysis, the panel is where a job is worked on.

- **Tracking**: posted and added dates are read only. **Applied on** and **Interview on** are editable.
  Marking a job applied fills in today's date, but an interview date is never guessed, because an
  interview is booked for a day only you know. Every save sends the whole tracking state, so clearing
  a date clears it on the server too.
- **Tailor resume**: rewrites the resume version that matched this posting so it speaks to this posting.
  It folds in the missing keywords the analysis found, keeps your own skill grouping and your employers,
  titles and metrics, and invents nothing. Stored on the job, so it is written once and read back after.
  Press it again to redo it.
- **Cover letter**: same idea, using the same chosen resume version.
- **Copy**: every generated section has a copy button. The tailored experience one copies the whole
  resume, summary and competencies and skills included, ready to paste into a document.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/jobs/import` | Analyze and store an array of postings |
| GET | `/api/jobs` | Paged grid, filtered by `company`, `status`, `minScore`, `board`, `from`, `to` |
| GET | `/api/jobs/metrics` | Card totals |
| GET | `/api/jobs/boards` | Distinct board names for the filter |
| GET | `/api/jobs/{id}` | Full detail including description and analysis |
| PATCH | `/api/jobs/{id}/status` | Replace the status and both tracking dates |
| POST | `/api/jobs/{id}/cover-letter` | Write a cover letter, cached until `?regenerate=true` |
| POST | `/api/jobs/{id}/resume` | Write the tailored resume, cached until `?regenerate=true` |

Both generators answer with the full job, so the client replaces one cached object.

## Notes

- Import runs five analyses at a time and answers when they all finish, so a large file holds the
  request open for a while. Fine for one person on a laptop, worth moving to a background job if
  a file ever holds hundreds of postings.
- `compose.yaml`, `.env` and `.env.example` in this folder came from another project and are unused here.
