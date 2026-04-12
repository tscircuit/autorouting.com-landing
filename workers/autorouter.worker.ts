import { AutoroutingPipelineSolver } from "@tscircuit/capacity-autorouter"
import {
  createSolvedTraceGraphics,
  sanitizeRouteGraphics,
} from "@/lib/autorouter/graphics-conversion"
import type {
  AutorouterSnapshot,
  AutorouterWorkerInbound,
  AutorouterWorkerOutbound,
  SolverRenderMode,
  WorkerPerformanceProfile,
} from "@/lib/autorouter/types"

const WORKER_PROFILE_CONFIG: Record<
  WorkerPerformanceProfile,
  {
    idleDelayMs: number
    maxStepsPerBatch: number
    snapshotIntervalMs: number
    stepBudgetMs: number
  }
> = {
  default: {
    idleDelayMs: 0,
    maxStepsPerBatch: 1500,
    snapshotIntervalMs: 80,
    stepBudgetMs: 14,
  },
  "mobile-safe": {
    idleDelayMs: 6,
    maxStepsPerBatch: 480,
    snapshotIntervalMs: 650,
    stepBudgetMs: 5,
  },
}

let activeRunId = 0

function postMessageToMain(message: AutorouterWorkerOutbound) {
  self.postMessage(message)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "The solver worker encountered an unexpected error."
}

function createSnapshot(
  solver: AutoroutingPipelineSolver,
  renderMode: SolverRenderMode,
  startedAt: number,
): AutorouterSnapshot {
  const view =
    renderMode === "output-traces"
      ? createSolvedTraceGraphics(solver.getOutputSimpleRouteJson())
      : sanitizeRouteGraphics(solver.preview(), { includeRects: false })

  return {
    renderMode,
    phase: solver.getCurrentPhase?.() ?? null,
    iterations: solver.iterations,
    progress: solver.progress,
    solved: solver.solved,
    failed: solver.failed,
    error: solver.error,
    elapsedMs: performance.now() - startedAt,
    view,
  }
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

async function runSolver(message: AutorouterWorkerInbound, runId: number) {
  try {
    const solver = new AutoroutingPipelineSolver(message.srj)
    const profileConfig = WORKER_PROFILE_CONFIG[message.profile ?? "default"]
    const startedAt = performance.now()
    let lastSnapshotAt = -Infinity
    let publishedTerminalSnapshot = false

    postMessageToMain({
      type: "started",
      snapshot: createSnapshot(solver, "preview", startedAt),
    })

    while (!solver.solved && !solver.failed && runId === activeRunId) {
      const batchStartAt = performance.now()
      let stepsThisBatch = 0

      while (
        stepsThisBatch < profileConfig.maxStepsPerBatch &&
        performance.now() - batchStartAt < profileConfig.stepBudgetMs &&
        !solver.solved &&
        !solver.failed
      ) {
        solver.step()
        stepsThisBatch += 1
      }

      const now = performance.now()
      const renderMode: SolverRenderMode = solver.solved
        ? "output-traces"
        : "preview"

      if (
        now - lastSnapshotAt >= profileConfig.snapshotIntervalMs ||
        solver.solved ||
        solver.failed
      ) {
        postMessageToMain({
          type: "snapshot",
          snapshot: createSnapshot(solver, renderMode, startedAt),
        })
        lastSnapshotAt = now
        publishedTerminalSnapshot = solver.solved || solver.failed
      }

      await sleep(profileConfig.idleDelayMs)
    }

    if (runId !== activeRunId || publishedTerminalSnapshot) {
      return
    }

    postMessageToMain({
      type: "snapshot",
      snapshot: createSnapshot(
        solver,
        solver.solved ? "output-traces" : "preview",
        startedAt,
      ),
    })
  } catch (error) {
    postMessageToMain({
      type: "error",
      message: getErrorMessage(error),
    })
  }
}

self.onmessage = (event: MessageEvent<AutorouterWorkerInbound>) => {
  const message = event.data

  if (message.type !== "start") {
    return
  }

  activeRunId += 1
  void runSolver(message, activeRunId)
}
