import type { JobMetrics } from '@/types'

interface MetricCardsProps {
  metrics?: JobMetrics
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards: { label: string; value: number; accent?: string }[] = [
    { label: 'Total Jobs', value: metrics?.total ?? 0 },
    { label: 'Pending', value: metrics?.pending ?? 0 },
    { label: 'Applied', value: metrics?.applied ?? 0 },
    { label: 'Interviewing', value: metrics?.interviewing ?? 0 },
    { label: 'High Match', value: metrics?.highMatch ?? 0, accent: 'text-secondary-dark' },
    { label: 'Action Needed', value: metrics?.actionNeeded ?? 0, accent: 'text-accent-dark' },
    { label: 'Avg Match', value: metrics?.averageScore ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{card.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${card.accent ?? 'text-gray-900'}`}>
            {card.label === 'Avg Match' ? `${card.value}%` : card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
