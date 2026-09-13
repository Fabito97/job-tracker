import { useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from './Button'
import { useResumes, useUploadResume, useDeleteResume, useSetDefaultResume } from '@/hooks/useResumes'
import { cn } from '@/lib/utils'

interface ResumesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ResumesModal({ isOpen, onClose }: ResumesModalProps) {
  const resumesQuery = useResumes()
  const uploadResume = useUploadResume()
  const deleteResume = useDeleteResume()
  const setDefaultResume = useSetDefaultResume()

  const [resumeRole, setResumeRole] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeIsDefault, setResumeIsDefault] = useState(false)
  const [expandedPreviewId, setExpandedPreviewId] = useState<number | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeSuccess, setResumeSuccess] = useState(false)

  if (!isOpen) return null

  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault()
    setResumeError(null)
    if (!resumeRole.trim()) {
      setResumeError('Please enter a role name (e.g. Backend, Full Stack).')
      return
    }
    if (!resumeFile) {
      setResumeError('Please select a .pdf or .txt resume file.')
      return
    }

    const formData = new FormData()
    formData.append('role', resumeRole.trim())
    formData.append('file', resumeFile)
    formData.append('isDefault', String(resumeIsDefault))

    try {
      await uploadResume.mutateAsync(formData)
      setResumeRole('')
      setResumeFile(null)
      setResumeIsDefault(false)
      setResumeSuccess(true)
      setTimeout(() => setResumeSuccess(false), 3000)
    } catch (err: unknown) {
      setResumeError(err instanceof Error ? err.message : 'Failed to upload resume.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manage Resumes & CVs</h2>
              <p className="text-xs text-gray-500">Upload multiple master resume versions for ATS matching and tailoring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Form Card */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upload New Resume</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload a .pdf or .txt resume. The file is saved locally to disk and text is extracted automatically for AI job matching.
              </p>
            </div>

            {resumeError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-800">
                {resumeError}
              </div>
            )}

            {resumeSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-2.5 text-xs text-green-800 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-green-600" />
                Resume uploaded and text extracted successfully!
              </div>
            )}

            <form onSubmit={handleUploadResume} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Role / Profile Name
                  </label>
                  <input
                    type="text"
                    value={resumeRole}
                    onChange={(e) => setResumeRole(e.target.value)}
                    placeholder="e.g. Backend, Full Stack, DevOps"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Resume File (.pdf or .txt)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setResumeFile(file)
                      if (file && !resumeRole.trim()) {
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
                        if (nameWithoutExt.toLowerCase().includes('backend')) setResumeRole('Backend')
                        else if (nameWithoutExt.toLowerCase().includes('full')) setResumeRole('Full Stack')
                        else if (nameWithoutExt.toLowerCase().includes('front')) setResumeRole('Frontend')
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 file:mr-2.5 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resumeIsDefault}
                    onChange={(e) => setResumeIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium text-gray-700">Set as Primary / Default Resume</span>
                </label>

                <Button
                  type="submit"
                  disabled={uploadResume.isPending || !resumeRole.trim() || !resumeFile}
                  leftIcon={
                    uploadResume.isPending ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )
                  }
                  className="text-xs px-3 py-1.5"
                >
                  {uploadResume.isPending ? 'Processing & Extracting...' : 'Upload Resume'}
                </Button>
              </div>
            </form>
          </div>

          {/* Uploaded Resumes List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Active Resumes ({resumesQuery.data?.length ?? 0})
              </h3>
              <span className="text-xs text-gray-500">
                Stored on disk and tracked in database
              </span>
            </div>

            {resumesQuery.isLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading resumes...</div>
            ) : !resumesQuery.data || resumesQuery.data.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
                No custom resumes uploaded yet. Existing <code>cv.txt</code> and <code>cv_f.txt</code> on disk are active as fallbacks.
              </div>
            ) : (
              <div className="space-y-2.5">
                {resumesQuery.data.map((r) => {
                  const isExpanded = expandedPreviewId === r.id
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'rounded-xl border p-3.5 transition-colors',
                        r.isDefault ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200 bg-white',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{r.role}</span>
                              {r.isDefault && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  <Star size={11} className="fill-amber-500 text-amber-500" /> Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {r.fileName} • {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!r.isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultResume.mutate(r.id)}
                              disabled={setDefaultResume.isPending}
                              className="text-xs text-gray-500 hover:text-amber-700 font-medium cursor-pointer"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedPreviewId(isExpanded ? null : r.id)}
                            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer ml-1"
                          >
                            {isExpanded ? (
                              <>Hide Text <ChevronUp size={13} /></>
                            ) : (
                              <>Preview Text <ChevronDown size={13} /></>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete resume "${r.role}" (${r.fileName})?`)) {
                                deleteResume.mutate(r.id)
                              }
                            }}
                            disabled={deleteResume.isPending}
                            className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1 cursor-pointer"
                            title="Delete resume"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">
                            Extracted Resume Text (read by AI):
                          </span>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 font-mono text-[11px] text-gray-800 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                            {r.preview}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

