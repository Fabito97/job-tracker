import { useState } from 'react'
import { Globe } from 'lucide-react'
import { Button } from './Button'
import { ScrapePanel } from './ScrapePanel'

/** Owns the scrape panel itself, so the page only has to place the button. */
export function ScrapeButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} leftIcon={<Globe size={16} />}>
        Scrape jobs
      </Button>

      {isOpen && <ScrapePanel onClose={() => setIsOpen(false)} />}
    </>
  )
}
