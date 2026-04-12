"use client"

import { GraphicsCanvas } from "@/components/autorouter/graphics-canvas"
import { useAutorouterWorker } from "@/components/autorouter/use-autorouter-worker"
import type { LoadedRouteProblem } from "@/lib/autorouter/types"

type InteractiveCanvasProps = {
  problem: LoadedRouteProblem | null
  isLoading: boolean
  loadError: string | null
}

export function InteractiveCanvas({
  problem,
  isLoading,
  loadError,
}: InteractiveCanvasProps) {
  const { snapshot, workerError } = useAutorouterWorker(problem)
  const errorMessage = loadError ?? workerError
  const emptyMessage = isLoading
    ? "Loading example..."
    : errorMessage
      ? errorMessage
      : null

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f8fafc]">
      <GraphicsCanvas
        key={problem?.id ?? "empty"}
        problem={problem}
        scene={snapshot?.view ?? null}
      />
      {emptyMessage ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  )
}
