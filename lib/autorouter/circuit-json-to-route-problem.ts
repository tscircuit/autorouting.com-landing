import type { RouteObstacle, RouteProblem } from "./types"

type CircuitJsonElement = Record<string, any>

type ConnectionGroup = {
  name: string
  nominalTraceWidth?: number
  sourceTraceIds: Set<string>
  sourceNetIds: Set<string>
  sourcePortIds: Set<string>
}

function getBoardLayers(layerCount: number) {
  if (layerCount <= 1) {
    return ["top"]
  }

  return [
    "top",
    ...Array.from(
      { length: Math.max(0, layerCount - 2) },
      (_, index) => `inner${index + 1}`,
    ),
    "bottom",
  ]
}

function getBounds(
  board: CircuitJsonElement,
  obstacles: RouteObstacle[],
): RouteProblem["bounds"] {
  const points = [
    ...(Array.isArray(board.outline) ? board.outline : []),
    ...obstacles.flatMap((obstacle) => [
      {
        x: obstacle.center.x - obstacle.width / 2,
        y: obstacle.center.y - obstacle.height / 2,
      },
      {
        x: obstacle.center.x + obstacle.width / 2,
        y: obstacle.center.y + obstacle.height / 2,
      },
    ]),
  ].filter(
    (point) =>
      typeof point?.x === "number" && typeof point?.y === "number",
  )

  if (points.length > 0) {
    return {
      minX: Math.min(...points.map((point) => point.x)) - 1,
      maxX: Math.max(...points.map((point) => point.x)) + 1,
      minY: Math.min(...points.map((point) => point.y)) - 1,
      maxY: Math.max(...points.map((point) => point.y)) + 1,
    }
  }

  if (
    typeof board.center?.x === "number" &&
    typeof board.center?.y === "number" &&
    typeof board.width === "number" &&
    typeof board.height === "number"
  ) {
    return {
      minX: board.center.x - board.width / 2,
      maxX: board.center.x + board.width / 2,
      minY: board.center.y - board.height / 2,
      maxY: board.center.y + board.height / 2,
    }
  }

  throw new Error("The KiCad PCB does not contain a usable board outline.")
}

function getElementDimensions(element: CircuitJsonElement) {
  if (element.type === "pcb_smtpad") {
    if (element.shape === "circle" && typeof element.radius === "number") {
      return {
        center: { x: element.x, y: element.y },
        width: element.radius * 2,
        height: element.radius * 2,
      }
    }

    if (
      element.shape === "polygon" &&
      Array.isArray(element.points) &&
      element.points.length > 0
    ) {
      const xs = element.points.map((point: { x: number }) => point.x)
      const ys = element.points.map((point: { y: number }) => point.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      return {
        center: {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        },
        width: maxX - minX,
        height: maxY - minY,
      }
    }

    if (
      typeof element.x === "number" &&
      typeof element.y === "number" &&
      typeof element.width === "number" &&
      typeof element.height === "number"
    ) {
      return {
        center: { x: element.x, y: element.y },
        width: element.width,
        height: element.height,
      }
    }
  }

  if (element.type === "pcb_plated_hole") {
    if (
      element.shape === "circle" &&
      typeof element.outer_diameter === "number"
    ) {
      return {
        center: { x: element.x, y: element.y },
        width: element.outer_diameter,
        height: element.outer_diameter,
      }
    }

    if (element.shape === "circular_hole_with_rect_pad") {
      return {
        center: { x: element.x, y: element.y },
        width: element.rect_pad_width,
        height: element.rect_pad_height,
      }
    }

    if (element.shape === "oval" || element.shape === "pill") {
      return {
        center: { x: element.x, y: element.y },
        width: element.outer_width,
        height: element.outer_height,
      }
    }

    if (
      element.shape === "hole_with_polygon_pad" &&
      Array.isArray(element.pad_outline) &&
      element.pad_outline.length > 0
    ) {
      const xs = element.pad_outline.map(
        (point: { x: number }) => element.x + point.x,
      )
      const ys = element.pad_outline.map(
        (point: { y: number }) => element.y + point.y,
      )
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      return {
        center: {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        },
        width: maxX - minX,
        height: maxY - minY,
      }
    }
  }

  if (element.type === "pcb_hole") {
    if (
      typeof element.hole_width === "number" &&
      typeof element.hole_height === "number"
    ) {
      return {
        center: { x: element.x, y: element.y },
        width: element.hole_width,
        height: element.hole_height,
      }
    }

    if (typeof element.hole_diameter === "number") {
      return {
        center: { x: element.x, y: element.y },
        width: element.hole_diameter,
        height: element.hole_diameter,
      }
    }
  }

  if (
    (element.type === "pcb_keepout" || element.type === "pcb_cutout") &&
    element.shape === "rect"
  ) {
    return {
      center: element.center,
      width: element.width,
      height: element.height,
    }
  }

  if (
    (element.type === "pcb_keepout" || element.type === "pcb_cutout") &&
    element.shape === "circle"
  ) {
    return {
      center: element.center,
      width: element.radius * 2,
      height: element.radius * 2,
    }
  }

  return null
}

export function createRouteProblemFromCircuitJson(
  circuitJson: CircuitJsonElement[],
): RouteProblem {
  const board = circuitJson.find((element) => element.type === "pcb_board")

  if (!board) {
    throw new Error("The KiCad file does not contain a PCB board.")
  }

  const layerCount =
    typeof board.num_layers === "number" ? board.num_layers : 2
  const everyLayer = getBoardLayers(layerCount)
  const pcbPorts = circuitJson.filter(
    (element) => element.type === "pcb_port",
  )
  const sourceTraces = circuitJson.filter(
    (element) => element.type === "source_trace",
  )
  const pcbPortBySourcePortId = new Map(
    pcbPorts
      .filter((port) => typeof port.source_port_id === "string")
      .map((port) => [port.source_port_id as string, port]),
  )
  const connectionGroups = new Map<string, ConnectionGroup>()

  for (const trace of sourceTraces) {
    const sourceNetIds = Array.isArray(trace.connected_source_net_ids)
      ? trace.connected_source_net_ids.filter(
          (id: unknown): id is string => typeof id === "string",
        )
      : []
    const groupName = sourceNetIds[0] ?? trace.source_trace_id

    if (typeof groupName !== "string") {
      continue
    }

    const group = connectionGroups.get(groupName) ?? {
      name: groupName,
      nominalTraceWidth:
        typeof trace.min_trace_thickness === "number"
          ? trace.min_trace_thickness
          : undefined,
      sourceTraceIds: new Set<string>(),
      sourceNetIds: new Set<string>(),
      sourcePortIds: new Set<string>(),
    }

    if (typeof trace.source_trace_id === "string") {
      group.sourceTraceIds.add(trace.source_trace_id)
    }

    for (const sourceNetId of sourceNetIds) {
      group.sourceNetIds.add(sourceNetId)
    }

    for (const sourcePortId of trace.connected_source_port_ids ?? []) {
      if (typeof sourcePortId === "string") {
        group.sourcePortIds.add(sourcePortId)
      }
    }

    if (typeof trace.min_trace_thickness === "number") {
      group.nominalTraceWidth = Math.max(
        group.nominalTraceWidth ?? 0,
        trace.min_trace_thickness,
      )
    }

    connectionGroups.set(groupName, group)
  }

  const connectionIdsBySourcePortId = new Map<string, string[]>()

  for (const group of connectionGroups.values()) {
    const connectionIds = [
      group.name,
      ...group.sourceTraceIds,
      ...group.sourceNetIds,
    ]

    for (const sourcePortId of group.sourcePortIds) {
      connectionIdsBySourcePortId.set(sourcePortId, connectionIds)
    }
  }

  const pcbPortById = new Map(
    pcbPorts.map((port) => [port.pcb_port_id as string, port]),
  )
  const obstacleElementTypes = new Set([
    "pcb_smtpad",
    "pcb_plated_hole",
    "pcb_hole",
    "pcb_keepout",
    "pcb_cutout",
  ])
  const obstacles = circuitJson
    .filter((element) => obstacleElementTypes.has(element.type))
    .map((element): RouteObstacle | null => {
      const dimensions = getElementDimensions(element)

      if (
        !dimensions ||
        !Number.isFinite(dimensions.center?.x) ||
        !Number.isFinite(dimensions.center?.y) ||
        !Number.isFinite(dimensions.width) ||
        !Number.isFinite(dimensions.height)
      ) {
        return null
      }

      const pcbPort =
        typeof element.pcb_port_id === "string"
          ? pcbPortById.get(element.pcb_port_id)
          : undefined
      const sourcePortId =
        typeof pcbPort?.source_port_id === "string"
          ? pcbPort.source_port_id
          : undefined
      const elementId =
        element.pcb_smtpad_id ??
        element.pcb_plated_hole_id ??
        element.pcb_hole_id ??
        element.pcb_keepout_id ??
        element.pcb_cutout_id
      const connectedTo = Array.from(
        new Set(
          [
            elementId,
            element.pcb_port_id,
            sourcePortId,
            ...(sourcePortId
              ? (connectionIdsBySourcePortId.get(sourcePortId) ?? [])
              : []),
          ].filter((id): id is string => typeof id === "string"),
        ),
      )
      const layers =
        element.type === "pcb_hole" || element.type === "pcb_plated_hole"
          ? everyLayer
          : Array.isArray(element.layers)
            ? element.layers
            : typeof element.layer === "string"
              ? [element.layer]
              : everyLayer

      return {
        type: element.shape === "circle" ? "oval" : "rect",
        center: dimensions.center,
        width: dimensions.width,
        height: dimensions.height,
        layers,
        connectedTo,
        componentId: element.pcb_component_id,
        ccwRotationDegrees:
          typeof element.ccw_rotation === "number"
            ? element.ccw_rotation
            : undefined,
      }
    })
    .filter((obstacle): obstacle is RouteObstacle => obstacle !== null)

  const connections = Array.from(connectionGroups.values())
    .map((group) => {
      const pointsToConnect = Array.from(group.sourcePortIds)
        .map((sourcePortId) => pcbPortBySourcePortId.get(sourcePortId))
        .filter(
          (port): port is CircuitJsonElement =>
            port !== undefined &&
            typeof port.x === "number" &&
            typeof port.y === "number",
        )
        .map((port) => ({
          x: port.x,
          y: port.y,
          layer: port.layers?.[0] ?? "top",
          pointId: port.pcb_port_id,
          pcb_port_id: port.pcb_port_id,
        }))

      return {
        name: group.name,
        source_trace_id:
          group.sourceTraceIds.size === 1
            ? Array.from(group.sourceTraceIds)[0]
            : undefined,
        nominalTraceWidth: group.nominalTraceWidth,
        width: group.nominalTraceWidth,
        pointsToConnect,
      }
    })
    .filter((connection) => connection.pointsToConnect.length >= 2)
  const minTraceWidth =
    typeof board.min_trace_width === "number" ? board.min_trace_width : 0.1

  return {
    bounds: getBounds(board, obstacles),
    connections,
    layerCount,
    minTraceWidth,
    minViaDiameter: board.min_via_pad_diameter,
    minViaHoleDiameter: board.min_via_hole_diameter,
    minViaPadDiameter: board.min_via_pad_diameter,
    min_via_hole_diameter: board.min_via_hole_diameter,
    min_via_pad_diameter: board.min_via_pad_diameter,
    obstacles,
    outline: Array.isArray(board.outline)
      ? board.outline.map((point: { x: number; y: number }) => ({
          x: point.x,
          y: point.y,
        }))
      : undefined,
  }
}
