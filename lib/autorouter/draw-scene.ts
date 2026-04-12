import { getBoardOutline, getVisibleBounds, mmToPxPoint, type ViewportMatrices } from "@/lib/autorouter/viewport"
import {
  DEFAULT_TRACE_COLOR,
  getCopperLayerColor,
  isDefaultTraceColor,
  PCB_VIEWER_COPPER_COLORS,
} from "@/lib/autorouter/layer-colors"
import type { RouteGraphics, RouteProblem } from "@/lib/autorouter/types"

const PCB_VIEWER_BACKGROUND = "rgb(0, 16, 35)"
const PCB_VIEWER_EDGE_CUTS = "rgb(208, 210, 205)"
const PCB_VIEWER_GRID = "rgb(132, 132, 132)"
const PCB_VIEWER_GRID_AXES = "rgb(194, 194, 194)"

const BACKGROUND_COLOR = PCB_VIEWER_BACKGROUND
const BOARD_STROKE = withAlpha(PCB_VIEWER_EDGE_CUTS, 0.7)
const MINOR_GRID = withAlpha(PCB_VIEWER_GRID, 0.16)
const MAJOR_GRID = withAlpha(PCB_VIEWER_GRID_AXES, 0.22)
const DEFAULT_OBSTACLE_FILL = "rgba(255,0,0,0.5)"
const SOLID_OBSTACLE_FILL = PCB_VIEWER_COPPER_COLORS.top
const BOTTOM_OBSTACLE_FILL = withAlpha(PCB_VIEWER_COPPER_COLORS.bottom, 0.5)
const MAX_CANVAS_DPR = 2

type RenderableCircle = NonNullable<RouteGraphics["circles"]>[number]
type RenderableLine = NonNullable<RouteGraphics["lines"]>[number]

const VIA_CENTER_FILL = "#ff4fc3"
const VIA_OUTER_STROKE = "#ff3b30"

function withAlpha(color: string, alpha: number) {
  const rgbMatch = color.match(
    /^rgb\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i,
  )

  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`
  }

  const hslMatch = color.match(
    /^hsl\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i,
  )

  if (hslMatch) {
    return `hsla(${hslMatch[1]}, ${hslMatch[2]}, ${hslMatch[3]}, ${alpha})`
  }

  return color
}

function parseDash(strokeDash: unknown, scalePxPerMm: number) {
  if (Array.isArray(strokeDash)) {
    return strokeDash
      .filter((value): value is number => typeof value === "number" && value > 0)
      .map((value) => Math.max(1, value * scalePxPerMm))
  }

  if (typeof strokeDash === "string") {
    return strokeDash
      .split(/[ ,]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.max(1, value * scalePxPerMm))
  }

  return []
}

function parseLayerIndices(layer: string | undefined) {
  if (!layer?.startsWith("z")) {
    return []
  }

  return layer
    .slice(1)
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
}

function makeOpaqueColor(color: string) {
  const rgbaMatch = color.match(
    /^rgba\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*[^)]+\)$/i,
  )

  if (rgbaMatch) {
    return `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`
  }

  const hslaMatch = color.match(
    /^hsla\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*[^)]+\)$/i,
  )

  if (hslaMatch) {
    return `hsl(${hslaMatch[1]}, ${hslaMatch[2]}, ${hslaMatch[3]})`
  }

  const longHexAlphaMatch = color.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i)

  if (longHexAlphaMatch) {
    return `#${longHexAlphaMatch[1]}`
  }

  const shortHexAlphaMatch = color.match(/^#([0-9a-f]{3})([0-9a-f])$/i)

  if (shortHexAlphaMatch) {
    return `#${shortHexAlphaMatch[1]}`
  }

  return color
}

function getLinePointLayer(line: RenderableLine) {
  const pointLayers = (line.points ?? [])
    .map((point: { layer?: string }) =>
      "layer" in point && typeof point.layer === "string" ? point.layer : null,
    )
    .filter((layer: string | null): layer is string => Boolean(layer))

  if (pointLayers.length === 0) {
    return null
  }

  return pointLayers.every((layer: string) => layer === pointLayers[0])
    ? pointLayers[0]
    : null
}

function isLowerLayerTrace(line: RenderableLine) {
  const pointLayer = getLinePointLayer(line)

  if (pointLayer === "bottom" || pointLayer?.startsWith("inner")) {
    return true
  }

  return Array.isArray(line.strokeDash) && line.strokeDash.length > 0
}

function getLineStrokeColor(line: RenderableLine) {
  const pointLayer = getLinePointLayer(line)
  const layerColor = getCopperLayerColor(pointLayer)

  if (!line.strokeColor || isDefaultTraceColor(line.strokeColor)) {
    return layerColor ?? DEFAULT_TRACE_COLOR
  }

  return line.strokeColor
}

function getGridStep(scalePxPerMm: number) {
  const candidateSteps = [0.5, 1, 2, 5, 10, 20, 50]

  for (const step of candidateSteps) {
    if (step * scalePxPerMm >= 28) {
      return step
    }
  }

  return 100
}

function drawGrid(ctx: CanvasRenderingContext2D, viewport: ViewportMatrices) {
  const visibleBounds = getVisibleBounds(viewport)
  const minorStep = getGridStep(viewport.scalePxPerMm)
  const majorStep = minorStep * 5

  ctx.save()

  for (
    let x = Math.floor(visibleBounds.minX / minorStep) * minorStep;
    x <= visibleBounds.maxX;
    x += minorStep
  ) {
    const screenX = mmToPxPoint(viewport, { x, y: 0 }).x
    const isMajor = Math.abs(x / majorStep - Math.round(x / majorStep)) < 0.001

    ctx.beginPath()
    ctx.moveTo(screenX, 0)
    ctx.lineTo(screenX, viewport.size.height)
    ctx.strokeStyle = isMajor ? MAJOR_GRID : MINOR_GRID
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (
    let y = Math.floor(visibleBounds.minY / minorStep) * minorStep;
    y <= visibleBounds.maxY;
    y += minorStep
  ) {
    const screenY = mmToPxPoint(viewport, { x: 0, y }).y
    const isMajor = Math.abs(y / majorStep - Math.round(y / majorStep)) < 0.001

    ctx.beginPath()
    ctx.moveTo(0, screenY)
    ctx.lineTo(viewport.size.width, screenY)
    ctx.strokeStyle = isMajor ? MAJOR_GRID : MINOR_GRID
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
}

function traceBoardOutlinePath(
  ctx: CanvasRenderingContext2D,
  problem: RouteProblem,
  viewport: ViewportMatrices,
) {
  const outline = getBoardOutline(problem)

  if (outline.length === 0) {
    return false
  }

  ctx.beginPath()

  outline.forEach((point, index) => {
    const screenPoint = mmToPxPoint(viewport, point)

    if (index === 0) {
      ctx.moveTo(screenPoint.x, screenPoint.y)
      return
    }

    ctx.lineTo(screenPoint.x, screenPoint.y)
  })

  ctx.closePath()

  return true
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  problem: RouteProblem,
  viewport: ViewportMatrices,
) {
  ctx.save()

  if (!traceBoardOutlinePath(ctx, problem, viewport)) {
    ctx.restore()
    return
  }

  ctx.strokeStyle = BOARD_STROKE
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: RouteGraphics["lines"],
  viewport: ViewportMatrices,
  pass: "lower" | "top",
) {
  for (const line of lines ?? []) {
    if (!line.points || line.points.length < 2) {
      continue
    }

    const lowerLayerTrace = isLowerLayerTrace(line)

    if ((pass === "lower" && !lowerLayerTrace) || (pass === "top" && lowerLayerTrace)) {
      continue
    }

    ctx.save()
    ctx.beginPath()

    line.points.forEach((point: { x: number; y: number }, index: number) => {
      const screenPoint = mmToPxPoint(viewport, point)

      if (index === 0) {
        ctx.moveTo(screenPoint.x, screenPoint.y)
      } else {
        ctx.lineTo(screenPoint.x, screenPoint.y)
      }
    })

    const strokeColor = getLineStrokeColor(line)

    ctx.strokeStyle = lowerLayerTrace
      ? makeOpaqueColor(strokeColor)
      : strokeColor
    ctx.lineWidth = Math.max(1, (line.strokeWidth ?? 0.15) * viewport.scalePxPerMm)
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.setLineDash(
      lowerLayerTrace ? [] : parseDash(line.strokeDash, viewport.scalePxPerMm),
    )
    ctx.stroke()
    ctx.restore()
  }
}

function drawRects(
  ctx: CanvasRenderingContext2D,
  rects: RouteGraphics["rects"],
  viewport: ViewportMatrices,
  layerCount: number,
) {
  for (const rect of rects ?? []) {
    const screenCenter = mmToPxPoint(viewport, rect.center)
    const width = rect.width * viewport.scalePxPerMm
    const height = rect.height * viewport.scalePxPerMm

    ctx.save()
    ctx.beginPath()
    ctx.rect(screenCenter.x - width / 2, screenCenter.y - height / 2, width, height)

    if (rect.fill) {
      const layerIndices = parseLayerIndices(rect.layer)
      const isBottomOnlyObstacle =
        rect.fill === DEFAULT_OBSTACLE_FILL &&
        layerIndices.length === 1 &&
        layerIndices[0] === layerCount - 1

      ctx.fillStyle =
        rect.fill === DEFAULT_OBSTACLE_FILL
          ? isBottomOnlyObstacle
            ? BOTTOM_OBSTACLE_FILL
            : SOLID_OBSTACLE_FILL
          : rect.fill
      ctx.fill()
    }

    if (rect.stroke) {
      ctx.strokeStyle = rect.stroke
      ctx.lineWidth = Math.max(1, (rect.strokeWidth ?? 0.08) * viewport.scalePxPerMm)
      ctx.stroke()
    }

    ctx.restore()
  }
}

function getCircleRadius(circle: RenderableCircle) {
  if ("radius" in circle && typeof circle.radius === "number") {
    return circle.radius
  }

  if ("r" in circle && typeof circle.r === "number") {
    return circle.r
  }

  return 0.25
}

function getCircleCenter(circle: RenderableCircle) {
  if ("center" in circle && circle.center) {
    return circle.center
  }

  if (
    "x" in circle &&
    "y" in circle &&
    typeof circle.x === "number" &&
    typeof circle.y === "number"
  ) {
    return {
      x: circle.x,
      y: circle.y,
    }
  }

  return {
    x: 0,
    y: 0,
  }
}

function isViaCircle(circle: RenderableCircle) {
  return circle.fill === "blue" && (!circle.stroke || circle.stroke === "none")
}

function drawCircles(
  ctx: CanvasRenderingContext2D,
  circles: RouteGraphics["circles"],
  viewport: ViewportMatrices,
) {
  for (const circle of circles ?? []) {
    const center = mmToPxPoint(viewport, getCircleCenter(circle))
    const radius = Math.max(1, getCircleRadius(circle) * viewport.scalePxPerMm)

    ctx.save()
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)

    if (circle.fill || isViaCircle(circle)) {
      ctx.fillStyle = isViaCircle(circle) ? VIA_CENTER_FILL : circle.fill!
      ctx.fill()
    }

    if (circle.stroke || isViaCircle(circle)) {
      ctx.strokeStyle = isViaCircle(circle) ? VIA_OUTER_STROKE : circle.stroke!
      ctx.lineWidth = isViaCircle(circle)
        ? Math.max(1.25, radius * 0.42)
        : Math.max(1, (circle.strokeWidth ?? 0.08) * viewport.scalePxPerMm)
      ctx.stroke()
    }

    ctx.restore()
  }
}

export function drawScene({
  canvas,
  problem,
  baseScene,
  overlayScene,
  viewport,
}: {
  canvas: HTMLCanvasElement
  problem: RouteProblem | null
  baseScene: RouteGraphics | null
  overlayScene: RouteGraphics | null
  viewport: ViewportMatrices | null
}) {
  const width = viewport?.size.width ?? canvas.clientWidth
  const height = viewport?.size.height ?? canvas.clientHeight
  const context = canvas.getContext("2d")

  if (!context || width === 0 || height === 0) {
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR)
  const nextWidth = Math.round(width * dpr)
  const nextHeight = Math.round(height * dpr)

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = BACKGROUND_COLOR
  context.fillRect(0, 0, width, height)

  if (!viewport || !problem) {
    return
  }

  drawGrid(context, viewport)
  drawBoard(context, problem, viewport)
  drawLines(context, baseScene?.lines, viewport, "lower")
  drawLines(context, overlayScene?.lines, viewport, "lower")
  drawRects(context, baseScene?.rects, viewport, problem.layerCount)
  drawRects(context, overlayScene?.rects, viewport, problem.layerCount)
  drawLines(context, baseScene?.lines, viewport, "top")
  drawLines(context, overlayScene?.lines, viewport, "top")
  drawCircles(context, baseScene?.circles, viewport)
  drawCircles(context, overlayScene?.circles, viewport)
}
