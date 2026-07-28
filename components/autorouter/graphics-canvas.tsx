"use client"

import { useEffect, useRef, useState } from "react"
import type { PointerEvent, WheelEvent } from "react"
import {
  drawBaseScene,
  drawOverlayScene,
} from "@/lib/autorouter/draw-scene"
import { createInputSrjGraphics } from "@/lib/autorouter/graphics-conversion"
import {
  loadLatestCircuitToCanvas,
  type CircuitToCanvasModule,
} from "@/lib/autorouter/runtime-packages"
import {
  createViewport,
  panViewport,
  pinchViewport,
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

type PointerState = {
  clientX: number
  clientY: number
}

type PinchState = {
  centerClient: {
    x: number
    y: number
  }
  distance: number
}

export function GraphicsCanvas({
  problem,
  scene,
}: GraphicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const pointersRef = useRef<Map<number, PointerState>>(new Map())
  const pinchStateRef = useRef<PinchState | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<ViewportMatrices | null>(null)
  const [inputScene, setInputScene] = useState<RouteGraphics | null>(null)
  const [circuitToCanvasModule, setCircuitToCanvasModule] =
    useState<CircuitToCanvasModule | null>(null)

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
    dragStateRef.current = null
    pinchStateRef.current = null
    pointersRef.current.clear()
  }, [problem?.id])

  useEffect(() => {
    let cancelled = false

    setCircuitToCanvasModule(null)

    if (!problem?.circuitJson) {
      return
    }

    loadLatestCircuitToCanvas()
      .then(({ module, version }) => {
        if (typeof module.CircuitToCanvasDrawer !== "function") {
          throw new Error(
            "The latest circuit-to-canvas package is missing its drawer export.",
          )
        }

        if (!cancelled) {
          console.info(
            `Rendering uploaded PCB with circuit-to-canvas@${version}`,
          )
          setCircuitToCanvasModule(module)
        }
      })
      .catch((error) => {
        console.error("Unable to load circuit-to-canvas:", error)
      })

    return () => {
      cancelled = true
    }
  }, [problem?.id])

  useEffect(() => {
    const canvas = baseCanvasRef.current

    if (!canvas) {
      return
    }

    drawBaseScene({
      canvas,
      problem: problem?.srj ?? null,
      baseScene: inputScene,
      viewport,
      circuitJson: problem?.circuitJson,
      circuitToCanvasModule,
    })
  }, [circuitToCanvasModule, inputScene, problem, viewport])

  useEffect(() => {
    const canvas = overlayCanvasRef.current

    if (!canvas) {
      return
    }

    drawOverlayScene({
      canvas,
      problem: problem?.srj ?? null,
      overlayScene: scene,
      viewport,
    })
  }, [problem, scene, viewport])

  function getCanvasPoint(clientX: number, clientY: number) {
    const canvas = overlayCanvasRef.current

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

  function getTrackedPointers() {
    return Array.from(pointersRef.current.values())
  }

  function createPinchState(pointers: PointerState[]): PinchState | null {
    if (pointers.length < 2) {
      return null
    }

    const [first, second] = pointers
    const deltaX = second.clientX - first.clientX
    const deltaY = second.clientY - first.clientY

    return {
      centerClient: {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      },
      distance: Math.max(1, Math.hypot(deltaX, deltaY)),
    }
  }

  function syncGestureStateAfterPointerChange() {
    const trackedPointers = getTrackedPointers()

    if (trackedPointers.length >= 2) {
      dragStateRef.current = null
      pinchStateRef.current = createPinchState(trackedPointers.slice(0, 2))
      return
    }

    pinchStateRef.current = null

    if (trackedPointers.length === 1) {
      const [pointer] = trackedPointers

      dragStateRef.current = {
        pointerId: Array.from(pointersRef.current.keys())[0]!,
        clientX: pointer.clientX,
        clientY: pointer.clientY,
      }
      return
    }

    dragStateRef.current = null
  }

  function releaseTrackedPointer(
    target: HTMLCanvasElement,
    pointerId: number,
  ) {
    pointersRef.current.delete(pointerId)

    if (dragStateRef.current?.pointerId === pointerId) {
      dragStateRef.current = null
    }

    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }

    syncGestureStateAfterPointerChange()
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (pointersRef.current.size >= 2) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })
    syncGestureStateAfterPointerChange()
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return
    }

    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })

    const trackedPointers = getTrackedPointers()

    if (trackedPointers.length >= 2 && viewport) {
      const previousPinch = pinchStateRef.current
      const nextPinch = createPinchState(trackedPointers.slice(0, 2))

      if (previousPinch && nextPinch) {
        const previousCenterPx = getCanvasPoint(
          previousPinch.centerClient.x,
          previousPinch.centerClient.y,
        )
        const nextCenterPx = getCanvasPoint(
          nextPinch.centerClient.x,
          nextPinch.centerClient.y,
        )

        if (previousCenterPx && nextCenterPx) {
          const factor = nextPinch.distance / previousPinch.distance

          setViewport((current) => {
            if (!current) {
              return current
            }

            return pinchViewport(current, factor, previousCenterPx, nextCenterPx)
          })
        }
      }

      pinchStateRef.current = nextPinch
      return
    }

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
    releaseTrackedPointer(event.currentTarget, event.pointerId)
  }

  function handlePointerLeave(event: PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      return
    }

    releaseTrackedPointer(event.currentTarget, event.pointerId)
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
        ref={baseCanvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
      />
      <canvas
        ref={overlayCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onDoubleClick={resetView}
        className="absolute inset-0 block h-full w-full cursor-grab touch-none overscroll-none active:cursor-grabbing"
      />
    </div>
  )
}
