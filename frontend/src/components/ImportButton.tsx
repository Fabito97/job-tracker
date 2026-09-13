import { useRef, useState, useEffect, type ChangeEvent } from 'react'
import { ChevronDown, Plus, Upload } from 'lucide-react'
import { AddJobModal } from './AddJobModal'
import { useImportJobs } from '@/hooks/useJobMutations'
import { cn } from '@/lib/utils'
import type { ImportResult } from '@/types'

export function ImportButton() {
  const fileInput = useRef<HTMLInputElement>(null)
  const importJobs = useImportJobs()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showMenu, setShowMenu] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('#add-job-split-button')) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // Lets the same file be imported again after a fix.
    if (!file) return

    setResult(null)
    setError(null)

    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!Array.isArray(parsed)) throw new Error('The file must contain an array of jobs.')

      setResult(await importJobs.mutateAsync(parsed))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {result && (
          <p className="text-sm text-gray-600 hidden md:block">
            Saved {result.saved} of {result.total}. Skipped {result.duplicates} duplicate, {result.blacklisted} blacklisted,{' '}
            {result.rejected} not worth applying, {result.failed} failed.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <input ref={fileInput} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />

        {/* Split Action Button: Add Job (Primary) | Dropdown (Menu) */}
        <div id="add-job-split-button" className="relative inline-flex rounded-lg shadow-xs">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={importJobs.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-l-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
            )}
          >
            <Plus size={16} />
            <span>{importJobs.isPending ? 'Scoring...' : 'Add job'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            disabled={importJobs.isPending}
            aria-label="Job import options"
            className={cn(
              'inline-flex items-center rounded-r-lg border-l border-primary-dark/30 bg-primary px-2 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
            )}
          >
            <ChevronDown size={14} className={cn('transition-transform', showMenu && 'rotate-180')} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  setShowAddModal(true)
                }}
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <Plus size={14} className="text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Add single job</div>
                  <div className="text-[11px] text-gray-500">Paste job link and description</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  fileInput.current?.click()
                }}
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <Upload size={14} className="text-emerald-600" />
                <div>
                  <div className="font-semibold text-gray-900">Import JSON file</div>
                  <div className="text-[11px] text-gray-500">Upload batch jobs.json</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onOpenUploadFile={() => fileInput.current?.click()}
      />
    </>
  )
}
