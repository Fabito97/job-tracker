import type { FormEvent } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { Button } from './Button'
import {JOB_STATUSES, type JobFilters, type JobStatus } from '@/types'

interface FilterBarProps {
  filters: JobFilters
  boards: string[]
  onChange: (filters: JobFilters) => void
  onSearch: () => void
  onReset: () => void
}

const fieldClasses =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export function FilterBar({ filters, boards, onChange, onSearch, onReset }: FilterBarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch()
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card">
      <label className="flex flex-1 basis-56 flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Company</span>
        <input
          type="search"
          value={filters.company ?? ''}
          onChange={(e) => onChange({ ...filters, company: e.target.value })}
          placeholder="Search by company name"
          className={fieldClasses}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Status</span>
        <select
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as JobStatus | undefined })}
          className={fieldClasses}
        >
          <option value="">All</option>
          {JOB_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Job board</span>
        <select
          value={filters.board ?? ''}
          onChange={(e) => onChange({ ...filters, board: e.target.value || undefined })}
          className={fieldClasses}
        >
          <option value="">All</option>
          {boards.map((board) => (
            <option key={board} value={board}>
              {board}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Posted from</span>
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
          className={fieldClasses}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Posted to</span>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
          className={fieldClasses}
        />
      </label>

      <Button type="submit" leftIcon={<Search size={16} />}>
        Search
      </Button>
      <Button type="button" variant="outline" onClick={onReset} leftIcon={<RotateCcw size={16} />}>
        Reset
      </Button>
    </form>
  )
}
