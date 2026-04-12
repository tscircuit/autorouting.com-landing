"use client"

import { useEffect, useRef, useState } from "react"
import type { PointerEvent, ReactNode, WheelEvent } from "react"
import { drawScene } from "@/lib/autorouter/draw-scene"
import { createInputSrjGraphics } from "@/lib/autorouter/graphics-conversion"
import {
  createViewport,
  panViewport,
  pxToMmPoint,
  zoomViewportAt,
  type ViewportMatrices,
} from "@/lib/autorouter/viewport"
import type { LoadedRouteProblem, RouteGraphics } from "@/lib/autorouter/types"

type OverlayRenderProps = {
  cursorMm: { x: number; y: number } | null
  resetView: () => void
  zoomIn: () => void
  zoomOut: () => void
  zoomPxPerMm: number
}

type GraphicsCanvasProps = {
  problem: LoadedRouteProblem | null
  scene: RouteGraphics | null
  children?: (props: OverlayRenderProps) => ReactNode
}

type DragState = {
  pointerId: number
  clientX: number
  clientY: number
}

export function GraphicsCanvas({
  problem,
  scene,
  children,
}: GraphicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<ViewportMatrices | null>(null)
  const [inputScene, setInputScene] = useState<RouteGraphics | null>(null)
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const element = containerRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }

      setSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize,
      )
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!problem || size.width === 0 || size.height === 0) {
      setViewport(null)
      return
    }

    setViewport(createViewport(problem.srj.bounds, size.width, size.height))
  }, [problem?.id, size.width, size.height])

  useEffect(() => {
    if (!problem) {
      setInputScene(null)
      return
    }

    setInputScene(createInputSrjGraphics(problem.srj))
  }, [problem?.id])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    drawScene({
      canvas,
      problem: problem?.srj ?? null,
      baseScene: inputScene,
      overlayScene: scene,
      viewport,
    })
  }, [inputScene, problem, scene, viewport])

  function getCanvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current

    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  function updateCursor(clientX: number, clientY: number) {
    if (!viewport) {
      return
    }

    const canvasPoint = getCanvasPoint(clientX, clientY)

    if (!canvasPoint) {
      return
    }

    setCursorMm(pxToMmPoint(viewport, canvasPoint))
  }

  function resetView() {
    if (!problem || size.width === 0 || size.height === 0) {
      return
    }

    setViewport(createViewport(problem.srj.bounds, size.width, size.height))
  }

  function zoomAtCenter(factor: number) {
    if (!viewport) {
      return
    }

    setViewport((current) => {
      if (!current) {
        return current
      }

      return zoomViewportAt(current, factor, {
        x: size.width / 2,
        y: size.height / 2,
      })
    })
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    }
    updateCursor(event.clientX, event.clientY)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    updateCursor(event.clientX, event.clientY)

    const dragState = dragStateRef.current

    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.clientX
    const deltaY = event.clientY - dragState.clientY

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    setViewport((current) => {
      if (!current) {
        return current
      }

      return panViewport(current, deltaX, deltaY)
    })
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handlePointerLeave() {
    dragStateRef.current = null
    setCursorMm(null)
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>) {
    if (!viewport) {
      return
    }

    event.preventDefault()

    const canvasPoint = getCanvasPoint(event.clientX, event.clientY)

    if (!canvasPoint) {
      return
    }

    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
    const nextViewport = zoomViewportAt(viewport, factor, canvasPoint)

    setViewport(() => nextViewport)
    setCursorMm(pxToMmPoint(nextViewport, canvasPoint))
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onDoubleClick={resetView}
        className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
      />
      {children?.({
        cursorMm,
        resetView,
        zoomIn: () => zoomAtCenter(1.15),
        zoomOut: () => zoomAtCenter(1 / 1.15),
        zoomPxPerMm: viewport?.scalePxPerMm ?? 0,
      })}
    </div>
  )
}
