import { getBoardOutline, getVisibleBounds, mmToPxPoint, type ViewportMatrices } from "@/lib/autorouter/viewport"
import type { RouteGraphics, RouteProblem } from "@/lib/autorouter/types"

const BACKGROUND_COLOR = "#0c1118"
const BOARD_FILL = "rgba(59, 130, 246, 0.08)"
const BOARD_STROKE = "rgba(255, 255, 255, 0.18)"
const MINOR_GRID = "rgba(255, 255, 255, 0.035)"
const MAJOR_GRID = "rgba(255, 255, 255, 0.075)"

type RenderableCircle = NonNullable<RouteGraphics["circles"]>[number]

function parseDash(strokeDash: unknown) {
  if (Array.isArray(strokeDash)) {
    return strokeDash.filter((value): value is number => typeof value === "number")
  }

  if (typeof strokeDash === "string") {
    return strokeDash
      .split(/[ ,]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
  }

  return []
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

function drawBoard(
  ctx: CanvasRenderingContext2D,
  problem: RouteProblem,
  viewport: ViewportMatrices,
) {
  const outline = getBoardOutline(problem)

  if (outline.length === 0) {
    return
  }

  ctx.save()
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
  ctx.fillStyle = BOARD_FILL
  ctx.strokeStyle = BOARD_STROKE
  ctx.lineWidth = 1.5
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: RouteGraphics["lines"],
  viewport: ViewportMatrices,
) {
  for (const line of lines ?? []) {
    if (!line.points || line.points.length < 2) {
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

    ctx.strokeStyle = line.strokeColor ?? "rgba(255, 255, 255, 0.85)"
    ctx.lineWidth = Math.max(1, (line.strokeWidth ?? 0.15) * viewport.scalePxPerMm)
    ctx.setLineDash(parseDash(line.strokeDash))
    ctx.stroke()
    ctx.restore()
  }
}

function drawRects(
  ctx: CanvasRenderingContext2D,
  rects: RouteGraphics["rects"],
  viewport: ViewportMatrices,
) {
  for (const rect of rects ?? []) {
    const screenCenter = mmToPxPoint(viewport, rect.center)
    const width = rect.width * viewport.scalePxPerMm
    const height = rect.height * viewport.scalePxPerMm

    ctx.save()
    ctx.beginPath()
    ctx.rect(screenCenter.x - width / 2, screenCenter.y - height / 2, width, height)

    if (rect.fill) {
      ctx.fillStyle = rect.fill
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

  if ("x" in circle && "y" in circle) {
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

    if (circle.fill) {
      ctx.fillStyle = circle.fill
      ctx.fill()
    }

    if (circle.stroke) {
      ctx.strokeStyle = circle.stroke
      ctx.lineWidth = Math.max(1, (circle.strokeWidth ?? 0.08) * viewport.scalePxPerMm)
      ctx.stroke()
    }

    ctx.restore()
  }
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  points: RouteGraphics["points"],
  viewport: ViewportMatrices,
) {
  for (const point of points ?? []) {
    const screenPoint = mmToPxPoint(viewport, point)
    const radius = Math.max(
      2.25,
      (("radius" in point && typeof point.radius === "number" ? point.radius : 0.16) *
        viewport.scalePxPerMm),
    )

    ctx.save()
    ctx.beginPath()
    ctx.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = point.color ?? point.fill ?? "#f8fafc"
    ctx.fill()
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

  const dpr = window.devicePixelRatio || 1
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
  drawRects(context, baseScene?.rects, viewport)
  drawLines(context, baseScene?.lines, viewport)
  drawCircles(context, baseScene?.circles, viewport)
  drawPoints(context, baseScene?.points, viewport)
  drawRects(context, overlayScene?.rects, viewport)
  drawLines(context, overlayScene?.lines, viewport)
  drawCircles(context, overlayScene?.circles, viewport)
  drawPoints(context, overlayScene?.points, viewport)
}
