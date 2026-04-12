"use client"

import { useEffect, useRef, useState } from "react"
import type { PointerEvent, WheelEvent } from "react"
import { drawScene } from "@/lib/autorouter/draw-scene"
import { createInputSrjGraphics } from "@/lib/autorouter/graphics-conversion"
import {
  createViewport,
  panViewport,
  zoomViewportAt,
  type ViewportMatrices,
} from "@/lib/autorouter/viewport"
import type { LoadedRouteProblem, RouteGraphics } from "@/lib/autorouter/types"

type GraphicsCanvasProps = {
  problem: LoadedRouteProblem | null
  scene: RouteGraphics | null
}

type DragState = {
  pointerId: number
  clientX: number
  clientY: number
}

export function GraphicsCanvas({
  problem,
  scene,
}: GraphicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<ViewportMatrices | null>(null)
  const [inputScene, setInputScene] = useState<RouteGraphics | null>(null)

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

  function resetView() {
    if (!problem || size.width === 0 || size.height === 0) {
      return
    }

    setViewport(createViewport(problem.srj.bounds, size.width, size.height))
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
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

    if (event.deltaY === 0) {
      return
    }

    const factor = event.deltaY < 0 ? 1.03 : 0.97
    const nextViewport = zoomViewportAt(viewport, factor, canvasPoint)

    setViewport(() => nextViewport)
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden overscroll-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onDoubleClick={resetView}
        className="block h-full w-full cursor-grab touch-none overscroll-none active:cursor-grabbing"
      />
    </div>
  )
}
