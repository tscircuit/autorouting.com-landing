export type RouteConnectionPoint = {
  x: number
  y: number
  layer?: string
  pcb_port_id?: string
  [key: string]: unknown
}

export type RouteObstacle = {
  center: {
    x: number
    y: number
  }
  width: number
  height: number
  layers: string[]
  zLayers?: number[]
  isCopperPour?: boolean
  [key: string]: unknown
}

export type RouteWire = {
  route_type: "wire"
  x: number
  y: number
  layer: string
  width?: number
  [key: string]: unknown
}

export type RouteVia = {
  route_type: "via"
  x: number
  y: number
  via_diameter?: number
  [key: string]: unknown
}

export type RouteJumper = {
  route_type: "jumper"
  start: {
    x: number
    y: number
  }
  end: {
    x: number
    y: number
  }
  layer: string
  [key: string]: unknown
}

export type RouteProblem = {
  layerCount: number
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  obstacles: RouteObstacle[]
  connections: Array<{
    name: string
    pointsToConnect: RouteConnectionPoint[]
    [key: string]: unknown
  }>
  traces?: Array<{
    route: Array<RouteWire | RouteVia | RouteJumper>
    [key: string]: unknown
  }>
  outline?: Array<{
    x: number
    y: number
  }>
  minTraceWidth: number
  nominalTraceWidth?: number
  minViaDiameter?: number
  [key: string]: unknown
}
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
