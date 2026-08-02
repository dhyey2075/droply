"use client"

import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react"
import type { IndexingStatusValue } from "@/lib/indexing-events-hub"

export function IndexingStatusBadge({
  status,
  error,
}: {
  status?: IndexingStatusValue | string | null
  error?: string | null
}) {
  if (!status || status === "INVALID") return null

  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium">
        <CheckCircle2 className="h-3 w-3" />
        Indexed
      </span>
    )
  }

  if (status === "INPROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        Indexing…
      </span>
    )
  }

  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium">
        <Clock className="h-3 w-3" />
        Queued
      </span>
    )
  }

  if (status === "FAILED") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium"
        title={error || "Indexing failed"}
      >
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    )
  }

  return null
}
