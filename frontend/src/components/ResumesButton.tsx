import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from './Button'
import { ResumesModal } from './ResumesModal'
import { useResumes } from '@/hooks/useResumes'

export function ResumesButton() {
  const [isOpen, setIsOpen] = useState(false)
  const resumesQuery = useResumes()
  const count = resumesQuery.data?.length ?? 0

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        leftIcon={<FileText size={16} />}
      >
        Resumes {count > 0 && <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{count}</span>}
      </Button>

      <ResumesModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

