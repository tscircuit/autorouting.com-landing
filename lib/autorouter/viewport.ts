import { applyToPoint, compose, inverse, scale, translate } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import type { RouteProblem } from "@/lib/autorouter/types"

export type WorldBounds = RouteProblem["bounds"]
export type WorldPoint = {
  x: number
  y: number
}

export type ViewportMatrices = {
  mmToPx: Matrix
  pxToMm: Matrix
  scalePxPerMm: number
  size: {
    width: number
    height: number
  }
}

function getScalePxPerMm(matrix: Matrix) {
  return Math.hypot(matrix.a, matrix.b)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createViewportFromMatrix(
  mmToPx: Matrix,
  width: number,
  height: number,
): ViewportMatrices {
  return {
    mmToPx,
    pxToMm: inverse(mmToPx),
    scalePxPerMm: getScalePxPerMm(mmToPx),
    size: {
      width,
      height,
    },
  }
}

export function createViewport(
  bounds: WorldBounds,
  width: number,
  height: number,
  padding = 56,
): ViewportMatrices {
  const worldWidth = Math.max(bounds.maxX - bounds.minX, 1)
  const worldHeight = Math.max(bounds.maxY - bounds.minY, 1)
  const scalePx = Math.max(
    1.5,
    Math.min((width - padding * 2) / worldWidth, (height - padding * 2) / worldHeight),
  )
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return createViewportFromMatrix(
    compose(
      translate(width / 2, height / 2),
      scale(scalePx, -scalePx),
      translate(-centerX, -centerY),
    ),
    width,
    height,
  )
}

export function panViewport(
  viewport: ViewportMatrices,
  deltaX: number,
  deltaY: number,
): ViewportMatrices {
  return createViewportFromMatrix(
    compose(translate(deltaX, deltaY), viewport.mmToPx),
    viewport.size.width,
    viewport.size.height,
  )
}

export function zoomViewportAt(
  viewport: ViewportMatrices,
  factor: number,
  anchorPx: WorldPoint,
): ViewportMatrices {
  const clampedScale = clamp(viewport.scalePxPerMm * factor, 1.5, 220)
  const adjustedFactor = clampedScale / viewport.scalePxPerMm

  return createViewportFromMatrix(
    compose(
      translate(anchorPx.x, anchorPx.y),
      scale(adjustedFactor, adjustedFactor),
      translate(-anchorPx.x, -anchorPx.y),
      viewport.mmToPx,
    ),
    viewport.size.width,
    viewport.size.height,
  )
}

export function mmToPxPoint(viewport: ViewportMatrices, point: WorldPoint) {
  return applyToPoint(viewport.mmToPx, point)
}

export function pxToMmPoint(viewport: ViewportMatrices, point: WorldPoint) {
  return applyToPoint(viewport.pxToMm, point)
}

export function getVisibleBounds(viewport: ViewportMatrices): WorldBounds {
  const topLeft = pxToMmPoint(viewport, {
    x: 0,
    y: 0,
  })
  const bottomRight = pxToMmPoint(viewport, {
    x: viewport.size.width,
    y: viewport.size.height,
  })

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  }
}

export function getBoardOutline(problem: RouteProblem): WorldPoint[] {
  if (problem.outline && problem.outline.length > 0) {
    return problem.outline
  }

  return [
    { x: problem.bounds.minX, y: problem.bounds.minY },
    { x: problem.bounds.maxX, y: problem.bounds.minY },
    { x: problem.bounds.maxX, y: problem.bounds.maxY },
    { x: problem.bounds.minX, y: problem.bounds.maxY },
  ]
}
