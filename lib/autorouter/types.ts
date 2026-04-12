import { AutoroutingPipelineSolver } from "@tscircuit/capacity-autorouter"

export type RouteProblem = ConstructorParameters<typeof AutoroutingPipelineSolver>[0]
export type RouteGraphics = ReturnType<AutoroutingPipelineSolver["preview"]>
export type ProblemExampleId = "arduino-uno-minimal" | "keyboard"

export type LoadedRouteProblem = {
  id: string
  displayName: string
  sourceLabel: string
  reportId?: string
  exampleId?: ProblemExampleId
  srj: RouteProblem
}

export type SolverRenderMode = "preview" | "output-traces"
export type AutorouterWorkerState =
  | "idle"
  | "starting"
  | "running"
  | "solved"
  | "failed"
  | "error"

export type AutorouterSnapshot = {
  renderMode: SolverRenderMode
  phase: string | null
  iterations: number
  progress: number
  solved: boolean
  failed: boolean
  error: string | null
  elapsedMs: number
  view: RouteGraphics
}

export type AutorouterWorkerInbound = {
  type: "start"
  srj: RouteProblem
}

export type AutorouterWorkerOutbound =
  | {
      type: "started"
      snapshot: AutorouterSnapshot
    }
  | {
      type: "snapshot"
      snapshot: AutorouterSnapshot
    }
  | {
      type: "error"
      message: string
    }
