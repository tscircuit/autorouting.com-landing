import { AutoroutingPipelineSolver } from "@tscircuit/capacity-autorouter"
import { createSolvedTraceGraphics } from "@/lib/autorouter/graphics-conversion"
import type {
  AutorouterSnapshot,
  AutorouterWorkerInbound,
  AutorouterWorkerOutbound,
  SolverRenderMode,
} from "@/lib/autorouter/types"

const STEP_BUDGET_MS = 14
const MAX_STEPS_PER_BATCH = 1500
const SNAPSHOT_INTERVAL_MS = 80

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
      : solver.preview()

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
        stepsThisBatch < MAX_STEPS_PER_BATCH &&
        performance.now() - batchStartAt < STEP_BUDGET_MS &&
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

      if (now - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS || solver.solved || solver.failed) {
        postMessageToMain({
          type: "snapshot",
          snapshot: createSnapshot(solver, renderMode, startedAt),
        })
        lastSnapshotAt = now
        publishedTerminalSnapshot = solver.solved || solver.failed
      }

      await sleep(0)
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
