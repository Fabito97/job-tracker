import { useState, useEffect } from "react"
import type { ImportResult, ScrapedJobRow } from "@/types"

export function useScrapeData(scrape: any) {
  const [rows, setRows] = useState<ScrapedJobRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [imported, setImported] = useState<ImportResult | null>(null)

  // Update rows when scrape results change
  useEffect(() => {
    if (scrape.data?.jobs) {
      setRows(scrape.data.jobs)
    }
  }, [scrape.data?.jobs])

  // Preselect jobs worth analyzing
  useEffect(() => {
    if (scrape.data) {
      setSelected(
        new Set(
          scrape.data.jobs
            .filter(isWorthAnalyzing)
            .map((row: ScrapedJobRow) => row.job.jobUrl)
        )
      )
    }
  }, [scrape.data])

  // Toggle selection
  const toggle = (url: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(url)) next.add(url)
      return next
    })

  const allSelected = rows.length > 0 && selected.size === rows.length
  const picked = rows.filter((row) => selected.has(row.job.jobUrl))

  return {
    rows,
    setRows,
    selected,
    setSelected,
    imported,
    setImported,
    toggle,
    allSelected,
    picked,
  }
}

export function usePersistentScrapeData(scrape: any) {
  const [rows, setRows] = useState<ScrapedJobRow[]>(() => {
    const saved = localStorage.getItem("scrapedJobs")
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    if (scrape.data?.jobs) {
      setRows(scrape.data.jobs)
    }
  }, [scrape.data?.jobs])

  useEffect(() => {
    localStorage.setItem("scrapedJobs", JSON.stringify(rows))
  }, [rows])

  return {rows, setRows}
}


/** Anything the importer would drop, or that has no text to score, is not worth paying for. */
function isWorthAnalyzing(row: ScrapedJobRow): boolean {
  return !row.isDuplicate && !row.isBlacklisted && !!row.job.jobDescription
}
