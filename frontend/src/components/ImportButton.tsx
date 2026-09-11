import { useRef, useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { Button } from './Button'
import { useImportJobs } from '@/hooks/useJobMutations'
import type { ImportResult } from '@/types'

export function ImportButton() {
  const fileInput = useRef<HTMLInputElement>(null)
  const importJobs = useImportJobs()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex items-center gap-3">
      {result && (
        <p className="text-sm text-gray-600">
          Saved {result.saved} of {result.total}. Skipped {result.duplicates} duplicate, {result.blacklisted} blacklisted,{' '}
          {result.rejected} not worth applying, {result.failed} failed.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <input ref={fileInput} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
      <Button onClick={() => fileInput.current?.click()} disabled={importJobs.isPending} leftIcon={<Upload size={16} />}>
        {importJobs.isPending ? 'Analyzing...' : 'Import jobs'}
      </Button>
    </div>
  )
}
