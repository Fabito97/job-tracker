import { useEffect, useState } from 'react'
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileText,
  KeyRound,
  Loader,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from './Button'
import { useResumes, useUploadResume, useDeleteResume, useSetDefaultResume } from '@/hooks/useResumes'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import type { UpdateSettingsRequest } from '@/types'

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  groq: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  gemini: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  custom: ['default'],
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useSettings()
  const updateSettings = useUpdateSettings()

  const [activeTab, setActiveTab] = useState<'ai' | 'criteria' | 'blacklist' | 'resumes'>('ai')

  // AI Form State
  const [provider, setProvider] = useState('gemini')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')

  // Criteria Form State
  const [minScore, setMinScore] = useState(60)
  const [requiresSponsorship, setRequiresSponsorship] = useState(false)
  const [requireClearanceCheck, setRequireClearanceCheck] = useState(false)
  const [targetLocation, setTargetLocation] = useState('')
  const [keepRejectedJobs, setKeepRejectedJobs] = useState(true)

  // Blacklist Form State
  const [blacklistEnabled, setBlacklistEnabled] = useState(true)
  const [blacklistCompanies, setBlacklistCompanies] = useState<string[]>([])
  const [newCompanyInput, setNewCompanyInput] = useState('')
  const [blacklistSearch, setBlacklistSearch] = useState('')
  const [isBulkMode, setIsBulkMode] = useState(false)

  // Resume Form State
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

  const [savedSuccess, setSavedSuccess] = useState(false)

  // Populate from fetched settings
  useEffect(() => {
    if (settings.data) {
      setProvider(settings.data.ai.provider)
      setModel(settings.data.ai.model)
      setBaseUrl(settings.data.ai.baseUrl ?? '')

      setMinScore(settings.data.criteria.minScore)
      setRequiresSponsorship(settings.data.criteria.requiresSponsorship)
      setRequireClearanceCheck(settings.data.criteria.requireClearanceCheck)
      setTargetLocation(settings.data.criteria.targetLocation ?? '')
      setKeepRejectedJobs(settings.data.criteria.keepRejectedJobs)

      if (settings.data.blacklist) {
        setBlacklistEnabled(settings.data.blacklist.enabled)
        setBlacklistCompanies(settings.data.blacklist.companies)
      }
    }
  }, [settings.data])

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider)
    const suggestions = MODEL_SUGGESTIONS[newProvider]
    if (suggestions && suggestions.length > 0) {
      setModel(suggestions[0])
    }
  }

  const handleAddCompany = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const raw = newCompanyInput
    if (!raw.trim()) return

    const lines = raw
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) return

    setBlacklistCompanies((prev) => {
      const existingLower = new Set(prev.map((c) => c.toLowerCase()))
      const toAdd: string[] = []
      for (const line of lines) {
        if (!existingLower.has(line.toLowerCase())) {
          existingLower.add(line.toLowerCase())
          toAdd.push(line)
        }
      }
      return [...toAdd, ...prev]
    })

    setNewCompanyInput('')
    setIsBulkMode(false)
  }

  const handleRemoveCompany = (companyToRemove: string) => {
    setBlacklistCompanies((prev) => prev.filter((c) => c !== companyToRemove))
  }

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

  const filteredBlacklist = blacklistCompanies.filter((c) =>
    c.toLowerCase().includes(blacklistSearch.trim().toLowerCase()),
  )

  const handleSave = async () => {
    const payload: UpdateSettingsRequest = {
      ai: {
        provider,
        model: model.trim(),
        ...(apiKey.trim().length > 0 ? { apiKey: apiKey.trim() } : {}),
        baseUrl: baseUrl.trim().length > 0 ? baseUrl.trim() : null,
      },
      criteria: {
        minScore,
        requiresSponsorship,
        requireClearanceCheck,
        targetLocation: targetLocation.trim().length > 0 ? targetLocation.trim() : null,
        keepRejectedJobs,
      },
      blacklist: {
        enabled: blacklistEnabled,
        companies: blacklistCompanies,
      },
    }

    await updateSettings.mutateAsync(payload)
    setApiKey('') // clear typed key input after successful save
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const providers = settings.data?.availableProviders ?? ['gemini', 'groq', 'openai', 'custom']

  const pendingCompaniesCount = newCompanyInput
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Application Settings</h2>
              <p className="text-xs text-gray-500">Configure AI provider, models, keys, and candidate matching rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'ai'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <Cpu size={16} />
            AI Provider & Models
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'criteria'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <SlidersHorizontal size={16} />
            Candidate Matching Criteria
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'blacklist'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <Ban size={16} />
            Company Blacklist
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
                activeTab === 'blacklist'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-gray-100 text-gray-600',
              )}
            >
              {blacklistCompanies.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('resumes')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'resumes'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <FileText size={16} />
            Resumes / CV
            {resumesQuery.data && resumesQuery.data.length > 0 && (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
                  activeTab === 'resumes'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-gray-100 text-gray-600',
                )}
              >
                {resumesQuery.data.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              <CheckCircle2 size={18} className="text-green-600" />
              Settings updated successfully and active immediately!
            </div>
          )}

          {updateSettings.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {updateSettings.error?.message || 'Failed to save settings.'}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                  Active AI Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderChange(p)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3 text-left font-medium transition-all',
                        provider.toLowerCase() === p.toLowerCase()
                          ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <span className="capitalize">{p}</span>
                      {provider.toLowerCase() === p.toLowerCase() && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Model Name
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gemini-2.5-flash, llama-3.3-70b-versatile, gpt-4o-mini"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {MODEL_SUGGESTIONS[provider] && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-500">Popular:</span>
                    {MODEL_SUGGESTIONS[provider].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setModel(sug)}
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                          model === sug
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                        )}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    API Key
                  </label>
                  {settings.data?.ai.hasApiKey && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <KeyRound size={12} /> Configured ({settings.data.ai.maskedApiKey})
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    settings.data?.ai.hasApiKey
                      ? 'Leave blank to keep existing key, or type new key to replace'
                      : 'Enter your API key'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Keys are stored locally in your SQLite/data store and never exposed in clear text.
                </p>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Base Endpoint URL (Optional)
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === 'groq'
                      ? 'https://api.groq.com/openai/v1'
                      : provider === 'custom'
                        ? 'http://localhost:11434/v1'
                        : 'Leave blank for official provider endpoint'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'criteria' && (
            <div className="space-y-5">
              {/* Min Score */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Minimum Match Score</span>
                    <p className="text-xs text-gray-500">Jobs scoring below this threshold are marked as disqualified</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minScore}
                      onChange={(e) => setMinScore(Math.min(Math.max(Number(e.target.value) || 0, 0), 100))}
                      className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-sm font-semibold text-gray-900 focus:border-primary focus:outline-none"
                    />
                    <span className="text-sm font-medium text-gray-500">/ 100</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Target Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Target Location Constraint
                </label>
                <input
                  type="text"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  placeholder="e.g. United States or leave blank for worldwide/unrestricted"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty if you are open to remote roles worldwide or local to multiple areas.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={requiresSponsorship}
                    onChange={(e) => setRequiresSponsorship(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Require Visa Sponsorship (F-1 / H-1B)</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When enabled, jobs that explicitly state &quot;No visa sponsorship&quot; will be rejected by the AI. When disabled, visa questions are completely omitted from prompts.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={requireClearanceCheck}
                    onChange={(e) => setRequireClearanceCheck(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Filter Out Security Clearance Jobs</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Rejects positions requiring active government security clearances or restricted citizenship status.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={keepRejectedJobs}
                    onChange={(e) => setKeepRejectedJobs(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Keep Disqualified / Rejected Jobs</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Preserves jobs that scored below your threshold under the &quot;Rejected&quot; tab with the AI&apos;s evaluation notes instead of permanently discarding them.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'blacklist' && (
            <div className="space-y-5">
              {/* Master Toggle */}
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={blacklistEnabled}
                  onChange={(e) => setBlacklistEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Enable Company Blacklist</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Automatically filters out matching companies before sending prompts to the AI, saving LLM tokens and API costs.
                  </p>
                </div>
              </label>

              {/* Add Company Section */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Add Companies
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBulkMode((prev) => !prev)}
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isBulkMode ? 'Switch to single-line input' : 'Paste list (each on a newline)'}
                  </button>
                </div>

                <form onSubmit={handleAddCompany} className="space-y-2">
                  {isBulkMode ? (
                    <div>
                      <textarea
                        rows={4}
                        value={newCompanyInput}
                        onChange={(e) => setNewCompanyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            handleAddCompany()
                          }
                        }}
                        placeholder={"Paste company names here, each on a new line:\nAcme Staffing\nConsultancy LLC\nDev Recruitment"}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-mono text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompanyInput}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData('text')
                          if (pasted && /[\r\n]/.test(pasted)) {
                            e.preventDefault()
                            const normalized = pasted.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
                            setIsBulkMode(true)
                            setNewCompanyInput(normalized)
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value
                          if (/[\r\n]/.test(val)) {
                            setIsBulkMode(true)
                          }
                          setNewCompanyInput(val)
                        }}
                        placeholder="Add company name (or paste multiple on newlines)..."
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs text-gray-500">
                      {pendingCompaniesCount > 0
                        ? `${pendingCompaniesCount} ${pendingCompaniesCount === 1 ? 'company' : 'companies'} detected ${isBulkMode ? '(Ctrl+Enter to add)' : ''}`
                        : isBulkMode
                          ? 'Each entry on a new line (Ctrl+Enter to add)'
                          : 'Type a name or paste a newline list'}
                    </span>
                    <Button
                      type="submit"
                      disabled={pendingCompaniesCount === 0}
                      leftIcon={<Plus size={15} />}
                      variant="secondary"
                    >
                      {pendingCompaniesCount > 1
                        ? `Add ${pendingCompaniesCount} Companies`
                        : 'Add Company'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Filter & Actions Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={blacklistSearch}
                    onChange={(e) => setBlacklistSearch(e.target.value)}
                    placeholder="Filter list..."
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-8.5 pr-3 py-1.5 text-xs text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {filteredBlacklist.length} of {blacklistCompanies.length} {blacklistCompanies.length === 1 ? 'company' : 'companies'}
                  </span>
                  {blacklistCompanies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all companies from the blacklist?')) {
                          setBlacklistCompanies([])
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1 ml-2"
                    >
                      <Trash2 size={12} /> Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Badges Container */}
              <div
                className={cn(
                  'rounded-xl border border-gray-200 p-3 max-h-72 overflow-y-auto transition-opacity',
                  !blacklistEnabled ? 'bg-gray-100/70 opacity-60' : 'bg-gray-50/40',
                )}
              >
                {!blacklistEnabled && (
                  <div className="mb-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
                    Blacklist is currently disabled. Matching companies will not be filtered out.
                  </div>
                )}
                {filteredBlacklist.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    {blacklistSearch.trim() ? 'No blacklisted companies match your search.' : 'No companies in blacklist.'}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredBlacklist.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200 shadow-2xs hover:border-gray-300 transition-colors"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => handleRemoveCompany(c)}
                          className="text-gray-400 hover:text-red-600 transition-colors rounded-xs focus:outline-none"
                          title={`Remove ${c}`}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resumes' && (
            <div className="space-y-6">
              {/* Upload Form Box */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Upload Candidate Resume</h3>
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            leftIcon={updateSettings.isPending ? <Loader size={16} className="animate-spin" /> : undefined}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
