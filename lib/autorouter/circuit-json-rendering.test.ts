import assert from "node:assert/strict"
import test from "node:test"
import { getCircuitJsonForCanvas } from "@/lib/autorouter/circuit-json-rendering"

test("keeps physical board elements and silkscreen for circuit-to-canvas", () => {
  const platedSlot = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "slot",
    shape: "pill",
    ccw_rotation: 270,
  }
  const elements = [
    { type: "pcb_board", pcb_board_id: "board" },
    { type: "pcb_smtpad", pcb_smtpad_id: "pad" },
    platedSlot,
    { type: "pcb_silkscreen_path", pcb_silkscreen_path_id: "outline" },
    { type: "pcb_keepout", pcb_keepout_id: "keepout" },
  ]

  assert.deepEqual(getCircuitJsonForCanvas(elements), elements)
  assert.equal(getCircuitJsonForCanvas(elements)[2], platedSlot)
  assert.equal(getCircuitJsonForCanvas(elements)[2]?.ccw_rotation, 270)
})

test("omits old routing and non-PCB metadata from the static canvas", () => {
  const board = { type: "pcb_board", pcb_board_id: "board" }

  assert.deepEqual(
    getCircuitJsonForCanvas([
      board,
      { type: "pcb_trace", pcb_trace_id: "old-trace" },
      { type: "pcb_via", pcb_via_id: "old-via" },
      { type: "pcb_copper_pour", pcb_copper_pour_id: "old-pour" },
      {
        type: "pcb_silkscreen_text",
        layer: "bottom",
        text: "Mirrored bottom text",
      },
      { type: "source_component", source_component_id: "component" },
      { type: "pcb_fabrication_note_text", text: "Fab note" },
    ]),
    [board],
  )
})
