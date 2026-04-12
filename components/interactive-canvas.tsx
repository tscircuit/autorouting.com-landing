"use client"

import { CanvasStatusPanel } from "@/components/autorouter/canvas-status-panel"
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
  const { snapshot, workerError, workerState } = useAutorouterWorker(problem)

  return (
    <div className="relative flex-1 overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#0c1118] shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <GraphicsCanvas key={problem?.id ?? "empty"} problem={problem} scene={snapshot?.view ?? null}>
        {({ cursorMm, resetView, zoomIn, zoomOut, zoomPxPerMm }) => (
          <CanvasStatusPanel
            problem={problem}
            snapshot={snapshot}
            workerState={workerState}
            isLoading={isLoading}
            loadError={loadError ?? workerError}
            cursorMm={cursorMm}
            zoomPxPerMm={zoomPxPerMm}
            onResetView={resetView}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        )}
      </GraphicsCanvas>
    </div>
  )
}
