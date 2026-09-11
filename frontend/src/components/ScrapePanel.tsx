import { useEffect, useState } from 'react'
import { ExternalLink, Search, Sparkles, X } from 'lucide-react'
import { Button } from './Button'
import { useImportJobs } from '@/hooks/useJobMutations'
import { useScrapeBoard, useScrapeDefaults } from '@/hooks/useScraper'
import { cn } from '@/lib/utils'
import type { ImportResult, ScrapedJobRow, ScrapeDefaults } from '@/types'
import { usePersistentScrapeData } from '@/hooks/useScrapeData'

const FALLBACK_BOARDS: ScrapeDefaults[] = [
  {
    board: 'LinkedIn',
    keywords: 'C# ".NET" software engineer',
    location: 'Remote',
    maxJobs: 25,
    companies: [],
    searchesByCompany: false,
    remoteOnly: true,
  },
  {
    board: 'Indeed',
    keywords: 'C# .NET backend developer',
    location: 'Nigeria',
    maxJobs: 25,
    companies: [],
    searchesByCompany: false,
    remoteOnly: false,
  },
  {
    board: 'Greenhouse',
    keywords: '.NET C#',
    location: 'Remote',
    maxJobs: 100,
    companies: ['virtu', 'growe', 'nintex', 'opentable', 'livefront', 'blackduck', 'ivalua', 'caseguard'],
    searchesByCompany: true,
    remoteOnly: true,
  },
  {
    board: 'Lever',
    keywords: '.NET C#',
    location: 'Remote',
    maxJobs: 100,
    companies: ['3pillarglobal', 'margo-group', 'Ubiminds', 'accesssoftek'],
    searchesByCompany: true,
    remoteOnly: true,
  },
]

/** Analysis is billed per job, so a run is triaged here before any of it is sent off. */
export function ScrapePanel({ onClose }: { onClose: () => void }) {
  const defaults = useScrapeDefaults()
  const scrape = useScrapeBoard()
  const importJobs = useImportJobs()

  const {rows} = usePersistentScrapeData(scrape)

  // Null means "not chosen or typed yet", so a configured default shows through without an effect.
  const [pickedBoard, setPickedBoard] = useState<string | null>(null)
  const [typedKeywords, setTypedKeywords] = useState<string | null>(null)
  const [typedLocation, setTypedLocation] = useState<string | null>(null)
  const [typedRemoteOnly, setTypedRemoteOnly] = useState<boolean | null>(null)
  const [datePosted, setDatePosted] = useState<string>('any')
  const [experienceLevel, setExperienceLevel] = useState<string>('all')
  const [excludeKeywords, setExcludeKeywords] = useState<string>('')
  const [typedCompanies, setTypedCompanies] = useState<string | null>(null)
  const [typedMax, setTypedMax] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [imported, setImported] = useState<ImportResult | null>(null)
  // const [rows, setRows] = useState<ScrapedJobRow[]>([])

  const boards = defaults.data && defaults.data.length > 0 ? defaults.data : FALLBACK_BOARDS
  const board = pickedBoard ?? boards[0]?.board ?? 'LinkedIn'
  const current = boards.find((entry) => entry.board === board)

  const keywords = typedKeywords ?? current?.keywords ?? ''
  const location = typedLocation ?? current?.location ?? ''
  const remoteOnly = typedRemoteOnly ?? current?.remoteOnly ?? false
  const maxJobs = typedMax ?? current?.maxJobs ?? 25
  const companies = typedCompanies ?? current?.companies.join('\n') ?? ''
  const byCompany = current?.searchesByCompany ?? false
  // const rows = scrape.data?.jobs ?? []

  // Each board searches for something different, so its own defaults take over on a switch.
  const changeBoard = (next: string) => {
    setPickedBoard(next)
    setTypedKeywords(null)
    setTypedLocation(null)
    setTypedRemoteOnly(null)
    setTypedCompanies(null)
    setTypedMax(null)
  }

  // A fresh run preselects only what is actually worth paying to analyze.
  useEffect(() => {
    if (scrape.data) setSelected(new Set(scrape.data.jobs.filter(isWorthAnalyzing).map((row) => row.job.jobUrl)))
  }, [scrape.data])

  // useEffect(() => {
  //   if (scrape.data?.jobs) setRows(scrape.data.jobs)
  // }, [scrape.data?.jobs])

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  const run = () => {
    setImported(null)
    scrape.mutate({
      board,
      keywords: keywords.trim() || undefined,
      location: location.trim() || undefined,
      remoteOnly,
      datePosted: datePosted !== 'any' ? datePosted : undefined,
      experienceLevel: experienceLevel !== 'all' ? experienceLevel : undefined,
      excludeKeywords: excludeKeywords.trim() || undefined,
      maxJobs,
      companies: byCompany ? companies.split('\n').map((line: string) => line.trim()).filter(Boolean) : undefined,
    })
  }

  const toggle = (url: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(url)) next.add(url)
      return next
    })

  const allSelected = rows.length > 0 && selected.size === rows.length
  const picked = rows.filter((row) => selected.has(row.job.jobUrl))
  const message = scrape.error?.message ?? importJobs.error?.message
  const isBusy = scrape.isPending || importJobs.isPending

  // if (isBusy) return (
  //   <div className='absolute flex justify-center items-center h-screen w-full'>
  //     <Loader className='w-20 h-20 text-blue-800' />
  //   </div>
  // )

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* {scrape.isPending && <div className='absolute flex justify-center items-center h-screen w-full'>
        <Loader className='w-20 h-20 text-blue-800' />
      </div>} */}
      <div className="flex-1 bg-black/30" onClick={onClose} aria-hidden />

      <aside className="flex w-full max-w-5xl flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scrape jobs</h2>
            <p className="text-sm text-gray-500">
              {scrape.isPending
                ? 'Reading the search, then each posting. Requests are paced to avoid being throttled, so this takes a few minutes.'
                : scrape.data
                  ? `${scrape.data.count} found, saved to ${scrape.data.file}. Pick the ones to analyze.`
                  : byCompany
                    ? 'Reads each company board through its API, so one request covers every job it has open.'
                    : `Searching ${location ? location : 'configured locations'}${remoteOnly ? ' (Remote)' : ''}.`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </header>

        <div className="flex flex-col border-b border-gray-200 bg-gray-50 px-6 py-4 gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col">
              <span className="text-xs font-medium text-gray-500">Board</span>
              <select
                value={board}
                onChange={(event) => changeBoard(event.target.value)}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {boards.map((entry) => (
                  <option key={entry.board} value={entry.board}>
                    {entry.board}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[14rem] flex-1 flex-col">
              <span className="text-xs font-medium text-gray-500">
                {byCompany ? 'Keywords (filters results)' : 'Keywords / Role'}
              </span>
              <input
                value={keywords}
                onChange={(event) => setTypedKeywords(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !isBusy && run()}
                placeholder={byCompany ? '.NET C#' : 'e.g. "C#" ".NET" engineer'}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="flex min-w-[13rem] flex-1 flex-col">
              <span className="text-xs font-medium text-gray-500">Location(s) &mdash; comma-separated</span>
              <input
                value={location}
                onChange={(event) => setTypedLocation(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !isBusy && run()}
                placeholder="e.g. Nigeria, EMEA, Worldwide"
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => setTypedRemoteOnly(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Remote only</span>
            </label>

            <label className="flex w-20 flex-col">
              <span className="text-xs font-medium text-gray-500">Max jobs</span>
              <input
                type="number"
                min={1}
                max={250}
                value={maxJobs}
                onChange={(event) => setTypedMax(Number(event.target.value))}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <Button onClick={run} disabled={isBusy} leftIcon={<Search size={16} />}>
              {scrape.isPending ? 'Scraping...' : 'Run scrape'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200/80 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-500">Posted:</span>
              <select
                value={datePosted}
                onChange={(e) => setDatePosted(e.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                <option value="any">Any time</option>
                <option value="24h">Past 24 hours</option>
                <option value="week">Past week (7d)</option>
                <option value="month">Past month (30d)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-500">Experience:</span>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                <option value="all">All levels</option>
                <option value="entry">Entry / Junior</option>
                <option value="mid">Mid-Senior</option>
                <option value="senior">Senior / Lead</option>
                <option value="director">Director / Exec</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[15rem]">
              <span className="font-medium text-gray-500 whitespace-nowrap">Exclude titles:</span>
              <input
                value={excludeKeywords}
                onChange={(e) => setExcludeKeywords(e.target.value)}
                placeholder="e.g. Intern, Java, Clearance, Unpaid"
                className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs placeholder:text-gray-400"
              />
            </div>
          </div>

          {byCompany && (
            <label className="flex w-full flex-col pt-1">
              <span className="text-xs font-medium text-gray-500">
                Companies &mdash; one board token or URL per line
              </span>
              <textarea
                value={companies}
                onChange={(event) => setTypedCompanies(event.target.value)}
                rows={3}
                spellCheck={false}
                placeholder={'virtu\nhttps://job-boards.greenhouse.io/growe'}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs"
              />
            </label>
          )}
        </div>

        {message && <p className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-600">{message}</p>}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs font-semibold tracking-wide text-gray-500 uppercase shadow-sm">
              <tr>
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={rows.length === 0}
                    aria-label="Select all"
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.job.jobUrl)))}
                  />
                </th>
                <th className="py-3">Title</th>
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Posted</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.job.jobUrl} className={cn('align-top', !isWorthAnalyzing(row) && 'bg-gray-50')}>
                  <td className="px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.job.jobUrl)}
                      onChange={() => toggle(row.job.jobUrl)}
                      aria-label={`Select ${row.job.jobTitle}`}
                    />
                  </td>
                  <td className="py-3 pr-3 font-medium text-gray-900">
                    {row.job.jobTitle}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.isDuplicate && <Badge className="bg-amber-50 text-amber-700">already tracked</Badge>}
                      {row.isBlacklisted && <Badge className="bg-red-50 text-red-700">blacklisted</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{row.job.company}</td>
                  <td className="px-3 py-3 text-gray-600">{row.job.location}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600">{row.job.date}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                    {row.job.jobDescription ? (
                      `${row.job.jobDescription.length.toLocaleString()} chars`
                    ) : (
                      <span className="text-red-600">missing</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <a
                      href={row.job.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open posting"
                      className="inline-flex text-gray-400 hover:text-gray-700"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!scrape.isPending && rows.length === 0 && (
            <p className="p-6 text-gray-500">
              {scrape.data ? 'No jobs matched that search.' : 'Run a scrape to see what is out there.'}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 p-6">
          {imported ? (
            <p className="text-sm text-gray-600">
              Saved {imported.saved} of {imported.total}. Skipped {imported.duplicates} duplicate,{' '}
              {imported.blacklisted} blacklisted, {imported.rejected} not worth applying, {imported.failed} failed.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              {rows.length > 0
                ? `${selected.size} of ${rows.length} selected. Greyed rows are duplicates, blacklisted, or have no description.`
                : 'Only the jobs you select are sent for analysis.'}
            </p>
          )}

          <Button
            disabled={picked.length === 0 || isBusy}
            onClick={() => importJobs.mutate(picked.map((row) => row.job), { onSuccess: setImported })}
            leftIcon={<Sparkles size={16} />}
          >
            {importJobs.isPending ? 'Analyzing...' : `Analyze ${picked.length} selected`}
          </Button>
        </footer>
      </aside>
    </div>
  )
}

/** Anything the importer would drop, or that has no text to score, is not worth paying for. */
function isWorthAnalyzing(row: ScrapedJobRow): boolean {
  return !row.isDuplicate && !row.isBlacklisted && !!row.job.jobDescription
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', className)}>{children}</span>
}
