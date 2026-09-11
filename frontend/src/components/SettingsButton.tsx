import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from './Button'
import { SettingsModal } from './SettingsModal'

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} leftIcon={<Settings size={16} />}>
        Settings
      </Button>

      {isOpen && <SettingsModal onClose={() => setIsOpen(false)} />}
    </>
  )
}

