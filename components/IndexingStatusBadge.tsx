"use client"

import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react"
import type { IndexingStatusValue } from "@/lib/indexing-events-hub"
import { cn } from "@/lib/utils"

const base =
  "inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[11px] font-medium leading-5"

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
      <span className={cn(base, "bg-success/10 text-success")}>
        <CheckCircle2 className="h-3 w-3" />
        Indexed
      </span>
    )
  }

  if (status === "INPROGRESS") {
    return (
      <span className={cn(base, "bg-brand-soft text-brand")}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Indexing
      </span>
    )
  }

  if (status === "PENDING") {
    return (
      <span className={cn(base, "bg-warning/10 text-warning")}>
        <Clock className="h-3 w-3" />
        Queued
      </span>
    )
  }

  if (status === "FAILED") {
    return (
      <span
        className={cn(base, "bg-destructive/10 text-destructive")}
        title={error || "Indexing failed"}
      >
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    )
  }

  return null
}
