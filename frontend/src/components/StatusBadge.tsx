import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types'

const statusClasses: Record<JobStatus, string> = {
  Pending: 'bg-gray-100 text-gray-700 border-gray-200',
  Applied: 'bg-primary-50 text-primary-dark border-primary-100',
  Interviewing: 'bg-accent-50 text-accent-dark border-accent-100',
  Offer: 'bg-secondary-50 text-secondary-dark border-secondary-100',
  Rejected: 'bg-red-50 text-red-700 border-red-100',
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={cn('inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium', statusClasses[status])}>
      {status}
    </span>
  )
}
