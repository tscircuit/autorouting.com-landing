import type {
  RouteGraphics,
  RouteGraphicsCircle,
  RouteGraphicsLine,
  RouteGraphicsPoint,
  RouteGraphicsRect,
  RouteProblem,
} from "@/lib/autorouter/types"
import {
  DEFAULT_TRACE_COLOR,
  getCopperLayerColor,
} from "@/lib/autorouter/layer-colors"

const DEFAULT_OBSTACLE_FILL = "rgba(255,0,0,0.5)"
const DEFAULT_VIA_FILL = "blue"

type TraceRouteItem = NonNullable<RouteProblem["traces"]>[number]["route"][number]
type GraphicsObjectLike = {
  rects?: unknown[]
  circles?: unknown[]
  lines?: unknown[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object"
}

function getPoint(value: unknown): RouteGraphicsPoint | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null
  }

  return {
    x: value.x,
    y: value.y,
    layer: typeof value.layer === "string" ? value.layer : undefined,
  }
}

function getLine(value: unknown): RouteGraphicsLine | null {
  if (!isRecord(value) || !Array.isArray(value.points)) {
    return null
  }

  const points = value.points
    .map((point) => getPoint(point))
    .filter((point): point is RouteGraphicsPoint => Boolean(point))

  if (points.length < 2) {
    return null
  }

  const strokeDash =
    typeof value.strokeDash === "string"
      ? value.strokeDash
      : Array.isArray(value.strokeDash)
        ? value.strokeDash.filter((entry): entry is number => isFiniteNumber(entry))
        : undefined

  return {
    points,
    strokeColor: typeof value.strokeColor === "string" ? value.strokeColor : undefined,
    strokeWidth: isFiniteNumber(value.strokeWidth) ? value.strokeWidth : undefined,
    strokeDash,
  }
}

function getRect(value: unknown): RouteGraphicsRect | null {
  if (!isRecord(value)) {
    return null
  }

  const center = getPoint(value.center)

  if (!center || !isFiniteNumber(value.width) || !isFiniteNumber(value.height)) {
    return null
  }

  return {
    center,
    width: value.width,
    height: value.height,
    fill: typeof value.fill === "string" ? value.fill : undefined,
    stroke: typeof value.stroke === "string" ? value.stroke : undefined,
    strokeWidth: isFiniteNumber(value.strokeWidth) ? value.strokeWidth : undefined,
    layer: typeof value.layer === "string" ? value.layer : undefined,
  }
}

function getCircle(value: unknown): RouteGraphicsCircle | null {
  if (!isRecord(value)) {
    return null
  }

  const center = getPoint(value.center)

  if (
    !center &&
    (!isFiniteNumber(value.x) || !isFiniteNumber(value.y))
  ) {
    return null
  }

  return {
    center: center ?? undefined,
    x: isFiniteNumber(value.x) ? value.x : undefined,
    y: isFiniteNumber(value.y) ? value.y : undefined,
    radius: isFiniteNumber(value.radius) ? value.radius : undefined,
    r: isFiniteNumber(value.r) ? value.r : undefined,
    fill: typeof value.fill === "string" ? value.fill : undefined,
    stroke: typeof value.stroke === "string" ? value.stroke : undefined,
    strokeWidth: isFiniteNumber(value.strokeWidth) ? value.strokeWidth : undefined,
  }
}

function getLayerIndex(layerName: string, layerCount: number) {
  if (layerName === "top") {
    return 0
  }

  if (layerName === "bottom") {
    return Math.max(0, layerCount - 1)
  }

  const normalized = layerName.toLowerCase()
  const innerMatch = normalized.match(/^(?:inner|in)(\d+)$/)

  if (!innerMatch) {
    return null
  }

  const index = Number(innerMatch[1])

  if (!Number.isInteger(index) || index < 1) {
    return null
  }

  return Math.min(index, Math.max(0, layerCount - 1))
}

function formatObstacleLayer(
  obstacle: RouteProblem["obstacles"][number],
  layerCount: number,
) {
  const indices = (
    obstacle.zLayers && obstacle.zLayers.length > 0
      ? obstacle.zLayers
      : obstacle.layers.map((layer) => getLayerIndex(layer, layerCount))
  )
    .filter((index): index is number => Number.isInteger(index))
    .filter((index) => index >= 0 && index < layerCount)

  if (indices.length === 0) {
    return undefined
  }

  const uniqueIndices = Array.from(new Set(indices)).sort((left, right) => left - right)

  return `z${uniqueIndices.join(",")}`
}

function createObstacleRect(
  obstacle: RouteProblem["obstacles"][number],
  layerCount: number,
): RouteGraphicsRect {
  return {
    center: {
      x: obstacle.center.x,
      y: obstacle.center.y,
    },
    width: obstacle.width,
    height: obstacle.height,
    fill: DEFAULT_OBSTACLE_FILL,
    layer: formatObstacleLayer(obstacle, layerCount),
  }
}

function createViaCircle(
  routeItem: Extract<TraceRouteItem, { route_type: "via" }>,
  srj: RouteProblem,
): RouteGraphicsCircle {
  const viaDiameter =
    routeItem.via_diameter ??
    srj.minViaDiameter ??
    Math.max(0.5, srj.minTraceWidth * 2)

  return {
    x: routeItem.x,
    y: routeItem.y,
    r: viaDiameter / 2,
    fill: DEFAULT_VIA_FILL,
  }
}

function createWireSegmentLine(
  start: Extract<TraceRouteItem, { route_type: "wire" }>,
  end: Extract<TraceRouteItem, { route_type: "wire" }>,
): RouteGraphicsLine | null {
  if (start.layer !== end.layer) {
    return null
  }

  if (start.x === end.x && start.y === end.y) {
    return null
  }

  return {
    points: [
      {
        x: start.x,
        y: start.y,
        layer: start.layer,
      },
      {
        x: end.x,
        y: end.y,
        layer: end.layer,
      },
    ],
    strokeColor: getCopperLayerColor(start.layer) ?? DEFAULT_TRACE_COLOR,
    strokeWidth: end.width ?? start.width,
  }
}

function createJumperLine(
  routeItem: Extract<TraceRouteItem, { route_type: "jumper" }>,
  srj: RouteProblem,
): RouteGraphicsLine | null {
  if (
    routeItem.start.x === routeItem.end.x &&
    routeItem.start.y === routeItem.end.y
  ) {
    return null
  }

  return {
    points: [
      {
        x: routeItem.start.x,
        y: routeItem.start.y,
        layer: routeItem.layer,
      },
      {
        x: routeItem.end.x,
        y: routeItem.end.y,
        layer: routeItem.layer,
      },
    ],
    strokeColor: getCopperLayerColor(routeItem.layer) ?? DEFAULT_TRACE_COLOR,
    strokeWidth: srj.nominalTraceWidth ?? srj.minTraceWidth,
  }
}

function createTraceGraphics(srj: RouteProblem) {
  const lines: RouteGraphicsLine[] = []
  const circles: RouteGraphicsCircle[] = []

  for (const trace of srj.traces ?? []) {
    const route = trace.route ?? []

    for (let index = 1; index < route.length; index += 1) {
      const previousItem = route[index - 1]
      const currentItem = route[index]

      if (previousItem.route_type === "wire" && currentItem.route_type === "wire") {
        const line = createWireSegmentLine(previousItem, currentItem)

        if (line) {
          lines.push(line)
        }
      }
    }

    for (const routeItem of route) {
      if (routeItem.route_type === "via") {
        circles.push(createViaCircle(routeItem, srj))
        continue
      }

      if (routeItem.route_type === "jumper") {
        const line = createJumperLine(routeItem, srj)

        if (line) {
          lines.push(line)
        }
      }
    }
  }

  return {
    lines,
    circles,
  }
}

function createSrjGraphics(srj: RouteProblem): RouteGraphics {
  const traceGraphics = createTraceGraphics(srj)

  return {
    rects: srj.obstacles.map((obstacle) => createObstacleRect(obstacle, srj.layerCount)),
    circles: traceGraphics.circles,
    lines: traceGraphics.lines,
    points: [],
  }
}

export function sanitizeRouteGraphics(
  graphics: GraphicsObjectLike | null | undefined,
  { includeRects = true }: { includeRects?: boolean } = {},
): RouteGraphics {
  return {
    rects: includeRects
      ? (graphics?.rects ?? [])
          .map((rect) => getRect(rect))
          .filter((rect): rect is RouteGraphicsRect => Boolean(rect))
      : [],
    circles: (graphics?.circles ?? [])
      .map((circle) => getCircle(circle))
      .filter((circle): circle is RouteGraphicsCircle => Boolean(circle)),
    lines: (graphics?.lines ?? [])
      .map((line) => getLine(line))
      .filter((line): line is RouteGraphicsLine => Boolean(line)),
    points: [],
  }
}

export function removeCopperPours(srj: RouteProblem): RouteProblem {
  return {
    ...srj,
    obstacles: srj.obstacles.filter((obstacle) => !obstacle.isCopperPour),
  }
}

export function createInputSrjGraphics(srj: RouteProblem): RouteGraphics {
  return createSrjGraphics(removeCopperPours(srj))
}

export function createSolvedTraceGraphics(srj: RouteProblem): RouteGraphics {
  return createSrjGraphics({
    ...srj,
    obstacles: [],
    connections: [],
  })
}
