import { HIGH_MATCH_SCORE } from './constants'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Formats both plain dates ("2026-08-18") and timestamps without shifting across time zones. */
export function formatDate(value?: string | null): string {
  if (!value) return '-'

  const [year, month, day] = value.split('T')[0].split('-').map(Number)

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Reduces a stored timestamp to the "YYYY-MM-DD" an <input type="date"> expects. */
export function toDateInput(value?: string | null): string {
  return value ? value.split('T')[0] : ''
}

export function scoreColor(score: number): string {
  if (score >= HIGH_MATCH_SCORE) return 'bg-secondary-50 text-secondary-dark border-secondary-100'
  if (score >= 60) return 'bg-accent-50 text-accent-dark border-accent-100'
  return 'bg-red-50 text-red-700 border-red-100'
}
