import { useEffect, type ReactNode } from 'react'
import { ExternalLink, FileText, Sparkles, X } from 'lucide-react'
import { Button } from './Button'
import { CopyButton } from './CopyButton'
import { StatusBadge } from './StatusBadge'
import { useJob } from '@/hooks/useJobs'
import { useCoverLetter, useTailoredResume, useUpdateTracking } from '@/hooks/useJobMutations'
import { cn, formatDate, scoreColor, toDateInput } from '@/lib/utils'
import { JOB_STATUSES, type JobDetail, type JobStatus, type TrackingUpdate } from '@/types'

interface JobDetailPanelProps {
  jobId: number
  onClose: () => void
}

export function JobDetailPanel({ jobId, onClose }: JobDetailPanelProps) {
  const { data: job, isLoading } = useJob(jobId)
  const tracking = useUpdateTracking()
  const coverLetter = useCoverLetter()
  const resume = useTailoredResume()

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  // Every save carries the current tracking state, so changing one field never disturbs the others.
  const save = (current: JobDetail, changes: Partial<TrackingUpdate>) =>
    tracking.mutate({
      id: current.id,
      status: current.status,
      appliedOn: toDateInput(current.appliedAt) || null,
      interviewOn: toDateInput(current.interviewAt) || null,
      ...changes,
    })

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} aria-hidden />

      <aside className="flex w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl">
        {isLoading || !job ? (
          <p className="p-6 text-gray-500">Loading job...</p>
        ) : (
          <>
            <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{job.jobTitle}</h2>
                <p className="text-sm text-gray-600">
                  {job.company} | {job.location} | {job.jobBoard}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', scoreColor(job.matchScore))}>
                    {job.matchScore}% match
                  </span>
                  <StatusBadge status={job.status} />
                  <span className="text-xs text-gray-500">{job.resumeVersion} resume</span>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X size={20} />
              </button>
            </header>

            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
              {/* {job.status === 'Pending' && (
                <Button variant="secondary" onClick={() => save(job, { status: 'Applied' })}>
                  Mark applied
                </Button>
              )} */}

              <select
                value={job.status}
                onChange={(e) => save(job, { status: e.target.value as JobStatus })}
                aria-label="Change status"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {JOB_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                disabled={resume.isPending}
                onClick={() => resume.mutate(job.id)}
                leftIcon={<Sparkles size={16} />}
              >
                {resume.isPending ? 'Tailoring...' : job.tailored ? 'Redo resume' : 'Tailor resume'}
              </Button>

              <Button
                variant="outline"
                disabled={coverLetter.isPending}
                onClick={() => coverLetter.mutate(job.id)}
                leftIcon={<FileText size={16} />}
              >
                {coverLetter.isPending ? 'Writing...' : 'Cover letter'}
              </Button>

              <a
                href={job.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={16} /> Open posting
              </a>
            </div>

            <div className="space-y-6 p-6 text-sm">
              <Section title="Tracking">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ReadOnlyDate label="Posted" value={job.postedDate} />
                  <ReadOnlyDate label="Added" value={job.createdAt} />
                  <DateField
                    label="Applied on"
                    value={toDateInput(job.appliedAt)}
                    onChange={(value) => save(job, { appliedOn: value || null })}
                  />
                  <DateField
                    label="Interview on"
                    value={toDateInput(job.interviewAt)}
                    onChange={(value) => save(job, { interviewOn: value || null })}
                  />
                </div>
              </Section>

              <Section title="Why this scored well">
                <p className="text-gray-700">{job.analysis.reason}</p>
              </Section>

              <Section title="Tailored summary" copy={job.analysis.tailoredSummary}>
                <p className="text-gray-700">{job.analysis.tailoredSummary}</p>
              </Section>

              <Section title="Matching strengths" copy={job.analysis.matchingStrengths.join(', ')}>
                <Tags values={job.analysis.matchingStrengths} className="bg-secondary-50 text-secondary-dark" />
              </Section>

              <Section title="Missing skills" copy={job.analysis.missingKeywords.join(', ')}>
                <Tags values={job.analysis.missingKeywords} className="bg-red-50 text-red-700" />
              </Section>

              {job.tailored && (
                <>
                  <Section title="Tailored core competencies" copy={job.tailored.coreCompetencies.join(' | ')}>
                    <p className="text-gray-700">{job.tailored.coreCompetencies.join(' | ')}</p>
                  </Section>

                  <Section title="Tailored technical skills" copy={job.tailored.technicalSkills.join('\n')}>
                    <ul className="space-y-1 text-gray-700">
                      {job.tailored.technicalSkills.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </Section>

                  <Section title="Tailored experience" copy={resumeText(job)}>
                    <div className="space-y-4">
                      {job.tailored.experience.map((role) => (
                        <div key={`${role.company} ${role.title}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900">
                              {role.company} | {role.title}
                            </p>
                            <CopyButton text={role.bullets.join('\n')} label="Copy bullets" />
                          </div>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-700">
                            {role.bullets.map((bullet) => (
                              <li key={bullet}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              <Section title="Sponsorship">
                <p className="text-gray-700">{job.analysis.sponsorshipNote}</p>
              </Section>

              {job.coverLetter && (
                <Section title="Cover letter" copy={job.coverLetter}>
                  <p className="whitespace-pre-wrap text-gray-700">{job.coverLetter}</p>
                </Section>
              )}

              <Section title="Job description">
                <p className="whitespace-pre-wrap text-gray-700">{job.description}</p>
              </Section>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

/** The whole generated resume as one block of text, ready to paste into a document. */
function resumeText(job: JobDetail): string {
  if (!job.tailored) return ''

  return [
    'SUMMARY',
    job.analysis.tailoredSummary,
    '',
    'CORE COMPETENCIES',
    job.tailored.coreCompetencies.join(' | '),
    '',
    'TECHNICAL SKILLS',
    ...job.tailored.technicalSkills,
    '',
    'EXPERIENCE',
    ...job.tailored.experience.flatMap((role) => [
      `${role.company} | ${role.title}`,
      ...role.bullets.map((bullet) => `- ${bullet}`),
      '',
    ]),
  ].join('\n')
}

function Section({ title, copy, children }: { title: string; copy?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{title}</h3>
        {copy !== undefined && <CopyButton text={copy} />}
      </div>
      {children}
    </section>
  )
}

function ReadOnlyDate({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-gray-700">{formatDate(value)}</p>
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
      />
    </label>
  )
}

function Tags({ values, className }: { values: string[]; className: string }) {
  if (values.length === 0) return <p className="text-gray-500">None listed.</p>

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className={cn('rounded-full px-2.5 py-1 text-xs font-medium', className)}>
          {value}
        </span>
      ))}
    </div>
  )
}
