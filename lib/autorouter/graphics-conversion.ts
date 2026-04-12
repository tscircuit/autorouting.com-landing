import { convertSrjToGraphicsObject } from "@tscircuit/capacity-autorouter"
import type { RouteGraphics, RouteProblem } from "@/lib/autorouter/types"

export function removeCopperPours(srj: RouteProblem): RouteProblem {
  return {
    ...srj,
    obstacles: srj.obstacles.filter((obstacle) => !obstacle.isCopperPour),
  }
}

export function createInputSrjGraphics(srj: RouteProblem): RouteGraphics {
  return convertSrjToGraphicsObject(removeCopperPours(srj))
}

export function createSolvedTraceGraphics(srj: RouteProblem): RouteGraphics {
  return convertSrjToGraphicsObject({
    ...srj,
    obstacles: [],
    connections: [],
  })
}
