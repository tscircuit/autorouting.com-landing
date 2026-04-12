export const PCB_VIEWER_COPPER_COLORS: Record<string, string> = {
  top: "rgb(200, 52, 52)",
  bottom: "rgb(77, 127, 196)",
  inner1: "rgb(127, 200, 127)",
  inner2: "rgb(206, 125, 44)",
  in1: "rgb(127, 200, 127)",
  in2: "rgb(206, 125, 44)",
}

export const DEFAULT_TRACE_COLOR = "rgba(255, 255, 255, 0.85)"

function normalizeColor(color: string) {
  return color.replace(/\s+/g, "").toLowerCase()
}

export function getCopperLayerColor(layer: string | null | undefined) {
  if (!layer) {
    return null
  }

  return PCB_VIEWER_COPPER_COLORS[layer.toLowerCase()] ?? null
}

export function isDefaultTraceColor(color: string | null | undefined) {
  if (!color) {
    return false
  }

  return normalizeColor(color) === normalizeColor(DEFAULT_TRACE_COLOR)
}
