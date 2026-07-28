import type { CircuitJsonElement } from "@/lib/autorouter/types"

const CIRCUIT_TO_CANVAS_ELEMENT_TYPES = new Set([
  "pcb_board",
  "pcb_panel",
  "pcb_smtpad",
  "pcb_plated_hole",
  "pcb_hole",
  "pcb_cutout",
  "pcb_keepout",
  "pcb_silkscreen_circle",
  "pcb_silkscreen_line",
  "pcb_silkscreen_oval",
  "pcb_silkscreen_path",
  "pcb_silkscreen_pill",
  "pcb_silkscreen_rect",
  "pcb_silkscreen_text",
])

export function getCircuitJsonForCanvas(
  circuitJson: CircuitJsonElement[],
) {
  return circuitJson.filter((element) => {
    if (
      typeof element.type !== "string" ||
      !CIRCUIT_TO_CANVAS_ELEMENT_TYPES.has(element.type)
    ) {
      return false
    }

    // Keep both copper sides visible for routing, but present the board as a
    // top-side view instead of overlaying mirrored bottom silkscreen.
    return !(
      element.type.startsWith("pcb_silkscreen_") &&
      element.layer === "bottom"
    )
  })
}
