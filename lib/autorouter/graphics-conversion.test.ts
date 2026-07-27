import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  createInputSrjGraphics,
  sanitizeRouteGraphics,
} from "@/lib/autorouter/graphics-conversion"
import type { RouteProblem } from "@/lib/autorouter/types"

describe("rotated obstacle graphics", () => {
  test("preserves SRJ obstacle rotations in the input scene", () => {
    const problem: RouteProblem = {
      layerCount: 2,
      bounds: {
        minX: -5,
        minY: -5,
        maxX: 5,
        maxY: 5,
      },
      connections: [],
      minTraceWidth: 0.1,
      obstacles: [
        {
          center: { x: 1, y: 2 },
          width: 1,
          height: 2.1,
          layers: ["top", "bottom"],
          ccwRotationDegrees: 270,
        },
      ],
    }

    assert.deepEqual(createInputSrjGraphics(problem).rects?.[0], {
      center: { x: 1, y: 2 },
      width: 1,
      height: 2.1,
      fill: "rgba(255,0,0,0.5)",
      layer: "z0,1",
      ccwRotationDegrees: 270,
    })
  })

  test("keeps rotation metadata from solver preview rectangles", () => {
    assert.equal(
      sanitizeRouteGraphics({
        rects: [
          {
            center: { x: 1, y: 2 },
            width: 1,
            height: 2.1,
            ccw_rotation: 270,
          },
        ],
      }).rects?.[0]?.ccwRotationDegrees,
      270,
    )
  })
})
