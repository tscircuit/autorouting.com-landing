"use client"

import type { WorkerPerformanceProfile } from "@/lib/autorouter/types"

type WorkerProfileIndicatorProps = {
  profile: WorkerPerformanceProfile
}

export function WorkerProfileIndicator({
  profile,
}: WorkerProfileIndicatorProps) {
  if (profile !== "mobile-safe") {
    return null
  }

  return (
    <span className="text-xs text-muted-foreground">
      Mobile CPU Throttle
    </span>
  )
}
