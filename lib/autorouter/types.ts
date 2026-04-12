import type { AutoroutingPipelineSolver } from "@tscircuit/capacity-autorouter"

export type RouteProblem = ConstructorParameters<typeof AutoroutingPipelineSolver>[0]
export type ProblemExampleId = "arduino-uno-minimal" | "keyboard"
export type WorkerPerformanceProfile = "default" | "mobile-safe"

export type RouteGraphicsPoint = {
  x: number
  y: number
  layer?: string
}

export type RouteGraphicsLine = {
  points: RouteGraphicsPoint[]
  strokeColor?: string
  strokeWidth?: number
  strokeDash?: number[] | string
}

export type RouteGraphicsRect = {
  center: {
    x: number
    y: number
  }
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  layer?: string
}

export type RouteGraphicsCircle = {
  center?: {
    x: number
    y: number
  }
  x?: number
  y?: number
  radius?: number
  r?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export type RouteGraphics = {
  rects?: RouteGraphicsRect[]
  circles?: RouteGraphicsCircle[]
  lines?: RouteGraphicsLine[]
  points?: RouteGraphicsPoint[]
}

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
  profile?: WorkerPerformanceProfile
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
