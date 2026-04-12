import type { AutorouterSnapshot, AutorouterWorkerState, LoadedRouteProblem } from "@/lib/autorouter/types"

type CanvasStatusPanelProps = {
  problem: LoadedRouteProblem | null
  snapshot: AutorouterSnapshot | null
  workerState: AutorouterWorkerState
  isLoading: boolean
  loadError: string | null
  cursorMm: { x: number; y: number } | null
  zoomPxPerMm: number
  onResetView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

function formatProgress(progress: number | null) {
  if (progress == null || progress <= 0) {
    return "Warming up"
  }

  return `${Math.round(progress * 100)}%`
}

function formatDuration(elapsedMs: number | null) {
  if (elapsedMs == null) {
    return "—"
  }

  return `${(elapsedMs / 1000).toFixed(1)}s`
}

function formatCursor(cursorMm: { x: number; y: number } | null) {
  if (!cursorMm) {
    return "—"
  }

  return `${cursorMm.x.toFixed(2)}, ${cursorMm.y.toFixed(2)} mm`
}

function getStatus(workerState: AutorouterWorkerState, isLoading: boolean) {
  if (isLoading) {
    return {
      label: "Loading",
      className: "border-white/10 bg-white/10 text-white/80",
    }
  }

  switch (workerState) {
    case "starting":
      return {
        label: "Starting",
        className: "border-sky-400/30 bg-sky-400/15 text-sky-100",
      }
    case "running":
      return {
        label: "Preview",
        className: "border-cyan-400/30 bg-cyan-400/15 text-cyan-100",
      }
    case "solved":
      return {
        label: "Solved",
        className: "border-emerald-400/30 bg-emerald-400/15 text-emerald-100",
      }
    case "failed":
      return {
        label: "Failed",
        className: "border-rose-400/30 bg-rose-400/15 text-rose-100",
      }
    case "error":
      return {
        label: "Worker Error",
        className: "border-rose-400/30 bg-rose-400/15 text-rose-100",
      }
    default:
      return {
        label: "Idle",
        className: "border-white/10 bg-white/10 text-white/80",
      }
  }
}

function Stat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </p>
      <p className="mt-1 text-[11px] text-white">{value}</p>
    </div>
  )
}

export function CanvasStatusPanel({
  problem,
  snapshot,
  workerState,
  isLoading,
  loadError,
  cursorMm,
  zoomPxPerMm,
  onResetView,
  onZoomIn,
  onZoomOut,
}: CanvasStatusPanelProps) {
  const status = getStatus(workerState, isLoading)
  const phase = snapshot?.phase ?? (problem ? "Initializing solver" : "Awaiting problem")
  const iterations = snapshot ? snapshot.iterations.toLocaleString() : "—"
  const renderMode = snapshot?.renderMode === "output-traces"
    ? "Output Traces"
    : "Preview"
  const solverError = snapshot?.error ?? loadError

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute left-4 top-4 w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-black/55 p-4 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              {problem?.sourceLabel ?? "Autorouter"}
            </p>
            <h2 className="mt-1 truncate text-sm font-medium text-white">
              {problem?.displayName ?? "Loading fixture…"}
            </h2>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {solverError ? (
          <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[11px] text-rose-100">
            {solverError}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label="Phase" value={phase} />
          <Stat label="Mode" value={renderMode} />
          <Stat label="Progress" value={formatProgress(snapshot?.progress ?? null)} />
          <Stat label="Iterations" value={iterations} />
          <Stat label="Elapsed" value={formatDuration(snapshot?.elapsedMs ?? null)} />
          <Stat label="Cursor" value={formatCursor(cursorMm)} />
          <Stat
            label="Zoom"
            value={zoomPxPerMm > 0 ? `${zoomPxPerMm.toFixed(1)} px/mm` : "—"}
          />
          <Stat label="Result" value={snapshot?.solved ? "Solved" : snapshot?.failed ? "Failed" : "Streaming"} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onZoomOut}
            className="h-8 w-8 rounded-lg border border-white/12 bg-white/6 text-sm text-white transition-colors hover:bg-white/12"
          >
            −
          </button>
          <button
            type="button"
            onClick={onResetView}
            className="h-8 rounded-lg border border-white/12 bg-white/6 px-3 text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/12"
          >
            Refit View
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="h-8 w-8 rounded-lg border border-white/12 bg-white/6 text-sm text-white transition-colors hover:bg-white/12"
          >
            +
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[11px] text-white/72 backdrop-blur">
        Drag to pan. Scroll or use +/- to zoom. Double-click to refit.
      </div>
    </div>
  )
}
