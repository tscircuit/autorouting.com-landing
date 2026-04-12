import type { RouteProblem } from "@/lib/autorouter/types"

export const ARDUINO_UNO_POWER_NET = "source_net_0"
export const ARDUINO_UNO_GROUND_NET = "source_net_3"

const ARDUINO_UNO_INNER1_POWER_POUR_ID = "arduino-uno-inner1-power-pour"
const ARDUINO_UNO_INNER2_GROUND_POUR_ID = "arduino-uno-inner2-ground-pour"

type CopperPourOptions = {
  obstacleId: string
  layer: string
  connectedTo: string[]
  srj: RouteProblem
}

export function createCopperPour({
  obstacleId,
  layer,
  connectedTo,
  srj,
}: CopperPourOptions): RouteProblem["obstacles"][number] {
  const { bounds } = srj

  return {
    obstacleId,
    type: "rect",
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    },
    layers: [layer],
    connectedTo,
    isCopperPour: true,
  }
}

export function applyArduinoUnoStaticSrjAdjustments(srj: RouteProblem): RouteProblem {
  const obstacles = srj.obstacles.filter(
    (obstacle) =>
      obstacle.obstacleId !== ARDUINO_UNO_INNER1_POWER_POUR_ID &&
      obstacle.obstacleId !== ARDUINO_UNO_INNER2_GROUND_POUR_ID,
  )

  const nextSrj: RouteProblem = {
    ...srj,
    layerCount: 4,
    obstacles,
  }

  nextSrj.obstacles = [
    ...nextSrj.obstacles,
    createCopperPour({
      obstacleId: ARDUINO_UNO_INNER1_POWER_POUR_ID,
      layer: "inner1",
      connectedTo: [ARDUINO_UNO_POWER_NET],
      srj: nextSrj,
    }),
    createCopperPour({
      obstacleId: ARDUINO_UNO_INNER2_GROUND_POUR_ID,
      layer: "inner2",
      connectedTo: [ARDUINO_UNO_GROUND_NET],
      srj: nextSrj,
    }),
  ]

  return nextSrj
}
