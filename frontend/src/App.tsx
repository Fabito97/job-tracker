import { useState } from 'react'
import { FilterBar } from '@/components/FilterBar'
import { ImportButton } from '@/components/ImportButton'
import { JobDetailPanel } from '@/components/JobDetailPanel'
import { JobTable } from '@/components/JobTable'
import { MetricCards } from '@/components/MetricCards'
import { ScrapeButton } from '@/components/ScrapeButton'
import { useBoards, useJobs, useMetrics } from '@/hooks/useJobs'
import { TABS, type Tab } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { JobFilters } from '@/types'

const noFilters: JobFilters = {}

export default function App() {
  // The draft is what the filter bar is showing; only Search or a tab commits it to the query.
  const [draft, setDraft] = useState<JobFilters>(noFilters)
  const [applied, setApplied] = useState<JobFilters>(noFilters)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const jobs = useJobs(applied, page)
  const metrics = useMetrics()
  const boards = useBoards()

  const apply = (filters: JobFilters) => {
    setDraft(filters)
    setApplied(filters)
    setPage(1)
  }

  const isActiveTab = (tab: Tab) => applied.status === tab.filter.status && applied.minScore === tab.filter.minScore

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Job Application Tracker</h1>
            <p className="text-sm text-gray-500">Import a jobs.json file, let the engine score it, then track what you applied to.</p>
          </div>
          <div className="flex items-center gap-3">
            <ScrapeButton />
            <ImportButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-6 py-6">
        <MetricCards metrics={metrics.data} />

        <FilterBar
          filters={draft}
          boards={boards.data ?? []}
          onChange={setDraft}
          onSearch={() => apply(draft)}
          onReset={() => apply(noFilters)}
        />

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => apply({ ...applied, status: tab.filter.status, minScore: tab.filter.minScore })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                isActiveTab(tab)
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {jobs.isError && <p className="text-sm text-red-600">Could not load jobs. Check that the API is running.</p>}

        <JobTable
          data={jobs.data}
          isLoading={jobs.isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPageChange={setPage}
        />
      </main>

      {selectedId !== null && <JobDetailPanel jobId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
