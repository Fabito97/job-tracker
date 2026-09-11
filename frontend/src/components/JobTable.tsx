import { ExternalLink } from 'lucide-react'
import { Button } from './Button'
import { StatusBadge } from './StatusBadge'
import { PAGE_SIZE } from '@/lib/constants'
import { cn, formatDate, scoreColor } from '@/lib/utils'
import type { JobListItem, Paged } from '@/types'

interface JobTableProps {
  data?: Paged<JobListItem>
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
  onPageChange: (page: number) => void
}

const columns = ['Company', 'Job Title', 'Location', 'Match', 'Status', 'Posted', 'Applied', 'Interview', 'Resume', '']

export function JobTable({ data, isLoading, selectedId, onSelect, onPageChange }: JobTableProps) {
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const page = data?.page ?? 1
  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              {columns.map((column, index) => (
                <th key={column || index} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((job) => (
              <tr
                key={job.id}
                tabIndex={0}
                onDoubleClick={() => onSelect(job.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(job.id)}
                title="Double click to open the full analysis"
                className={cn(
                  'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
                  selectedId === job.id ? 'bg-primary-50' : 'hover:bg-gray-50',
                )}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{job.company}</td>
                <td className="px-4 py-3 text-gray-700">{job.jobTitle}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{job.location}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', scoreColor(job.matchScore))}>
                    {job.matchScore}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(job.postedDate)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(job.appliedAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(job.interviewAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{job.resumeVersion}</td>
                <td className="px-4 py-3">
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open the posting"
                    className="text-gray-400 hover:text-primary"
                  >
                    <ExternalLink size={16} />
                  </a>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  {isLoading ? 'Loading jobs...' : 'No jobs match these filters. Import a jobs.json file to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
        <span>
          {total === 0 ? 'No results' : `${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {lastPage}
          </span>
          <Button variant="outline" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
