"use client"

import { useEffect, useState } from "react"
import { GraphicsCanvas } from "@/components/autorouter/graphics-canvas"
import { StartOverlay } from "@/components/autorouter/start-overlay"
import { useAutorouterWorker } from "@/components/autorouter/use-autorouter-worker"
import type {
  LoadedRouteProblem,
  RouteProblem,
  WorkerPerformanceProfile,
} from "@/lib/autorouter/types"

type InteractiveCanvasProps = {
  problem: LoadedRouteProblem | null
  isLoading: boolean
  loadError: string | null
  onProfileChange?: (profile: WorkerPerformanceProfile) => void
  onRoutedProblemChange?: (problem: RouteProblem | null) => void
}

export function InteractiveCanvas({
  problem,
  isLoading,
  loadError,
  onProfileChange,
  onRoutedProblemChange,
}: InteractiveCanvasProps) {
  const [hasStartedSolver, setHasStartedSolver] = useState(false)
  const [workerProfile, setWorkerProfile] =
    useState<WorkerPerformanceProfile>("default")
  const activeProblem = hasStartedSolver ? problem : null
  const { snapshot, workerError } = useAutorouterWorker(
    activeProblem,
    workerProfile,
  )
  const errorMessage = loadError ?? workerError
  const emptyMessage = isLoading
    ? "Loading example..."
    : errorMessage
      ? errorMessage
      : null
  const showStartOverlay =
    Boolean(problem) && !isLoading && !errorMessage && !hasStartedSolver

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number
    }
    const prefersCoarsePointer = window.matchMedia("(pointer: coarse)").matches
    const lowCoreCount =
      navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
    const lowMemory =
      typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4

    if (prefersCoarsePointer || lowCoreCount || lowMemory) {
      setWorkerProfile("mobile-safe")
    }
  }, [])

  useEffect(() => {
    onProfileChange?.(workerProfile)
  }, [onProfileChange, workerProfile])

  useEffect(() => {
    onRoutedProblemChange?.(snapshot?.outputSrj ?? null)
  }, [onRoutedProblemChange, snapshot?.outputSrj])

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-[rgb(0,16,35)]">
      <GraphicsCanvas
        key={problem?.id ?? "empty"}
        problem={problem}
        scene={snapshot?.view ?? null}
      />
      {showStartOverlay ? (
        <StartOverlay onStart={() => setHasStartedSolver(true)} />
      ) : null}
      {emptyMessage ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/60">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  )
}
