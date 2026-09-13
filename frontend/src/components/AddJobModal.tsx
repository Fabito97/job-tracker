import { useState, useEffect, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { Button } from './Button'
import { useImportJobs } from '@/hooks/useJobMutations'
import type { ImportResult } from '@/types'

interface AddJobModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenUploadFile: () => void
}

function deriveJobBoard(url: string): string {
  try {
    const parsed = new URL(url)
    const parts = parsed.hostname.split('.')
    const name = parts.length >= 2 ? parts[parts.length - 2] : parsed.hostname
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return 'Other'
  }
}

export function AddJobModal({ isOpen, onClose, onOpenUploadFile }: AddJobModalProps) {
  const importJobs = useImportJobs()

  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [location, setLocation] = useState('Remote')
  const [jobBoard, setJobBoard] = useState('')
  const [description, setDescription] = useState('')

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setFeedback(null)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !importJobs.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, importJobs.isPending])

  if (!isOpen) return null

  const handleUrlChange = (val: string) => {
    setJobUrl(val)
    if (!jobBoard || jobBoard === 'Other') {
      const derived = deriveJobBoard(val)
      if (derived && derived !== 'Other') {
        setJobBoard(derived)
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    const trimmedTitle = jobTitle.trim()
    const trimmedCompany = company.trim()
    const trimmedUrl = jobUrl.trim()
    const trimmedDesc = description.trim()

    if (!trimmedTitle || !trimmedCompany || !trimmedUrl || !trimmedDesc) {
      setFeedback({
        type: 'error',
        message: 'Please fill in all required fields: Job Title, Company, Job URL, and Job Description.',
      })
      return
    }

    try {
      const payload = [
        {
          jobTitle: trimmedTitle,
          company: trimmedCompany,
          jobUrl: trimmedUrl,
          location: location.trim() || undefined,
          jobBoard: (jobBoard.trim() || deriveJobBoard(trimmedUrl)) || undefined,
          jobDescription: trimmedDesc,
        },
      ]

      const result: ImportResult = await importJobs.mutateAsync(payload)

      if (result.saved > 0) {
        setFeedback({
          type: 'success',
          message: `Successfully analyzed and saved "${trimmedTitle}" at ${trimmedCompany}!`,
        })
        setTimeout(() => {
          onClose()
          setJobTitle('')
          setCompany('')
          setJobUrl('')
          setLocation('Remote')
          setJobBoard('')
          setDescription('')
          setFeedback(null)
        }, 1200)
      } else if (result.duplicates > 0) {
        setFeedback({
          type: 'warning',
          message: `This job posting has already been added to your tracker (duplicate URL).`,
        })
      } else if (result.blacklisted > 0) {
        setFeedback({
          type: 'warning',
          message: `"${trimmedCompany}" is on your company blacklist, so this job was excluded.`,
        })
      } else if (result.rejected > 0) {
        setFeedback({
          type: 'warning',
          message: `AI analysis determined this job does not meet your application criteria and was not saved.`,
        })
      } else {
        setFeedback({
          type: 'error',
          message: `Could not analyze this job. Please check the description and try again.`,
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={importJobs.isPending ? undefined : onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add & Analyze Job</h2>
              <p className="text-xs text-gray-500">Paste details to score against your resume and start tracking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importJobs.isPending}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-start gap-2.5 border-b px-6 py-3 text-xs ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : feedback.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={16} className={`mt-0.5 shrink-0 ${feedback.type === 'warning' ? 'text-amber-600' : 'text-red-600'}`} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Backend Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Stripe, OpenAI, GitHub"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Job URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://..."
              value={jobUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Remote, Lagos, London"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Job Board / Platform</label>
              <input
                type="text"
                placeholder="e.g. Greenhouse, Lever, LinkedIn"
                value={jobBoard}
                onChange={(e) => setJobBoard(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Job Description & Requirements <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400">Pasted text used by AI for match scoring</span>
            </div>
            <textarea
              required
              rows={8}
              placeholder="Paste the full job description, qualifications, and role responsibilities here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-xs text-gray-900 shadow-inner focus:border-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Footer controls */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenUploadFile()
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              <Upload size={14} />
              <span>Or import batch JSON file</span>
            </button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={importJobs.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={importJobs.isPending} leftIcon={importJobs.isPending ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}>
                {importJobs.isPending ? 'Scoring & Saving...' : 'Analyze & Save Job'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

