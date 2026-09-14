import { useEffect, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Edit3, ExternalLink, FileText, MapPin, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from './Button'
import { CopyButton } from './CopyButton'
import { StatusBadge } from './StatusBadge'
import { useJob } from '@/hooks/useJobs'
import { useCoverLetter, useTailoredResume, useUpdateDirectives, useUpdateTracking } from '@/hooks/useJobMutations'
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
  const directives = useUpdateDirectives()

  const [showNotesMenu, setShowNotesMenu] = useState(false)
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [notesText, setNotesText] = useState<string>('')

  useEffect(() => {
    if (job?.tailoringNotes !== undefined) {
      setNotesText(job.tailoringNotes ?? '')
    }
  }, [job?.tailoringNotes])

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  // Every save carries the current tracking state, so changing one field never disturbs the others.
  // Every save carries the current tracking state, so changing one field never disturbs the others.
  const save = (current: JobDetail, changes: Partial<TrackingUpdate>) =>
    tracking.mutate({
      id: current.id,
      status: current.status,
      appliedOn: toDateInput(current.appliedAt) || null,
      interviewOn: toDateInput(current.interviewAt) || null,
      ...changes,
    })

  const toggleSkill = (skill: string) => {
    if (!job) return
    const current = job.confirmedSkills ?? []
    const next = current.some((s) => s.toLowerCase() === skill.toLowerCase())
      ? current.filter((s) => s.toLowerCase() !== skill.toLowerCase())
      : [...current, skill]
    directives.mutate({ id: job.id, confirmedSkills: next })
  }

  const handleDirectTailor = () => {
    if (!job) return
    resume.mutate({
      id: job.id,
      regenerate: true,
      confirmedSkills: job.confirmedSkills,
      notes: job.tailoringNotes,
    })
  }

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

              {/* Split Action Button for Tailoring */}
              <div className="relative inline-flex rounded-lg shadow-xs">
                <button
                  type="button"
                  disabled={resume.isPending}
                  onClick={handleDirectTailor}
                  className="inline-flex items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles size={16} className="text-blue-600" />
                  <span>{resume.isPending ? 'Tailoring...' : job.tailored ? 'Refine resume' : 'Tailor resume'}</span>
                </button>
                <button
                  type="button"
                  disabled={resume.isPending}
                  onClick={() => setShowNotesMenu((prev) => !prev)}
                  aria-label="Tailoring directives menu"
                  className="inline-flex items-center rounded-r-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronDown size={14} className={cn('transition-transform', showNotesMenu && 'rotate-180')} />
                </button>

                {showNotesMenu && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotesEditor(true)
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <Edit3 size={13} className="text-blue-600" />
                      <span>{job.tailoringNotes ? 'Edit tailoring directives' : 'Add tailoring directives'}</span>
                    </button>

                    {job.tailored && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotesMenu(false)
                          resume.mutate({
                            id: job.id,
                            regenerate: true,
                            mode: 'fresh',
                            confirmedSkills: job.confirmedSkills,
                            notes: job.tailoringNotes,
                          })
                        }}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <RotateCcw size={13} className="text-amber-600" />
                        <span>Start fresh from base CV</span>
                      </button>
                    )}

                    {job.tailoringNotes && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotesText('')
                          directives.mutate({ id: job.id, tailoringNotes: '' })
                          setShowNotesMenu(false)
                        }}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Clear saved directives</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

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

            {/* Directives Editor Panel */}
            {showNotesEditor && (
              <div className="border-b border-gray-200 bg-blue-50/50 p-6">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <Edit3 size={14} className="text-blue-600" />
                    <span>Tailoring Directives & Context</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNotesEditor(false)}
                    aria-label="Close directives editor"
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-2.5">
                  Guide the AI on what themes, technologies, or achievements to highlight or de-emphasize for this specific application:
                </p>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={3}
                  placeholder="e.g. Focus heavily on backend microservices and AWS; emphasize leading the RabbitMQ project; keep tone concise and technical."
                  className="w-full rounded-md border border-gray-300 bg-white p-2.5 text-xs text-gray-900 shadow-inner focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => directives.mutate({ id: job.id, tailoringNotes: notesText })}
                    disabled={directives.isPending}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {directives.isPending ? 'Saving...' : 'Save directives'}
                  </button>
                  <Button
                    className="py-1.5 px-3 text-xs"
                    disabled={resume.isPending}
                    onClick={() => {
                      directives.mutate({ id: job.id, tailoringNotes: notesText })
                      resume.mutate({ id: job.id, regenerate: true, notes: notesText, confirmedSkills: job.confirmedSkills })
                      setShowNotesEditor(false)
                    }}
                    leftIcon={<Sparkles size={14} />}
                  >
                    {resume.isPending ? 'Tailoring...' : job.tailored ? 'Refine with directives' : 'Tailor with directives'}
                  </Button>
                </div>
              </div>
            )}

            {/* Active Directives Banner */}
            {!showNotesEditor && job.tailoringNotes && (
              <div className="flex items-center justify-between border-b border-gray-200 bg-amber-50/60 px-6 py-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold">Directives:</span>
                  <span className="truncate italic text-amber-800">"{job.tailoringNotes}"</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotesEditor(true)}
                  className="ml-3 shrink-0 font-medium text-amber-700 underline hover:text-amber-900 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}

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

              <Section
                title={job.tailored?.summary ? 'Tailored summary (Refined)' : 'Tailored summary'}
                copy={job.tailored?.summary || job.analysis.tailoredSummary}
              >
                <p className="text-gray-700">{job.tailored?.summary || job.analysis.tailoredSummary}</p>
              </Section>

              <Section title="Matching strengths" copy={job.analysis.matchingStrengths.join(', ')}>
                <Tags values={job.analysis.matchingStrengths} className="bg-secondary-50 text-secondary-dark" />
              </Section>

              <Section title="Missing skills" copy={job.analysis.missingKeywords.join(', ')}>
                {job.analysis.missingKeywords.length === 0 ? (
                  <p className="text-xs italic text-gray-500">None! Candidate matches all key requirements.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Click skills you possess to confirm and incorporate them into your tailored resume:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.analysis.missingKeywords.map((skill) => {
                        const isConfirmed = (job.confirmedSkills ?? []).some(
                          (s) => s.toLowerCase() === skill.toLowerCase()
                        )
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            disabled={directives.isPending}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none',
                              isConfirmed
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-xs'
                                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300'
                            )}
                          >
                            {isConfirmed ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span>{skill}</span>
                                <span className="rounded-full bg-emerald-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-900">
                                  Confirmed
                                </span>
                              </>
                            ) : (
                              <>
                                <Plus size={12} className="text-red-500" />
                                <span>{skill}</span>
                              </>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
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

              {/* Location Eligibility */}
              {(job.analysis.locationEligibility || job.analysis.locationNote) && (
                <Section title="Location Eligibility">
                  <div className="space-y-2">
                    {job.analysis.locationEligibility && (
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            job.analysis.locationEligibility.toLowerCase().includes('eligible') &&
                              !job.analysis.locationEligibility.toLowerCase().includes('ineligible')
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : job.analysis.locationEligibility.toLowerCase().includes('ineligible')
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200',
                          )}
                        >
                          <MapPin size={12} />
                          {job.analysis.locationEligibility}
                        </span>
                      </div>
                    )}
                    {job.analysis.locationNote && (
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                        {job.analysis.locationNote}
                      </p>
                    )}
                  </div>
                </Section>
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
    job.tailored?.summary || job.analysis.tailoredSummary,
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
