import {
  DEFAULT_PROBLEM_EXAMPLE_ID,
  getProblemExample,
} from "@/lib/autorouter/problem-examples"
import { createRouteProblemFromCircuitJson } from "@/lib/autorouter/circuit-json-to-route-problem"
import { loadLatestKicadToCircuitJson } from "@/lib/autorouter/runtime-packages"
import type {
  CircuitJsonElement,
  LoadedRouteProblem,
  ProblemExampleId,
  RouteProblem,
} from "@/lib/autorouter/types"

type RouteProblemEnvelope = {
  autorouting_bug_report_id?: string
  title?: string
  simple_route_json: RouteProblem
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isRouteProblem(value: unknown): value is RouteProblem {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.layerCount === "number" &&
    isRecord(value.bounds) &&
    Array.isArray(value.obstacles) &&
    Array.isArray(value.connections)
  )
}

function extractRouteProblem(payload: unknown): {
  reportId?: string
  srj: RouteProblem
  title?: string
} {
  if (isRecord(payload) && "simple_route_json" in payload) {
    const envelope = payload as RouteProblemEnvelope

    if (!isRouteProblem(envelope.simple_route_json)) {
      throw new Error(
        "The uploaded bug report does not contain a valid simple_route_json payload.",
      )
    }

    return {
      reportId: envelope.autorouting_bug_report_id,
      srj: envelope.simple_route_json,
      title: envelope.title,
    }
  }

  if (isRouteProblem(payload)) {
    return {
      srj: payload,
    }
  }

  throw new Error(
    "Expected either a simple route JSON object or an autorouter bug-report envelope.",
  )
}

function createLoadedProblem({
  displayName,
  exampleId,
  reportId,
  circuitJson,
  converterVersion,
  routedFileName,
  sourceLabel,
  srj,
}: {
  displayName: string
  exampleId?: ProblemExampleId
  reportId?: string
  circuitJson?: CircuitJsonElement[]
  converterVersion?: string
  routedFileName?: string
  sourceLabel: string
  srj: RouteProblem
}): LoadedRouteProblem {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    displayName,
    exampleId,
    reportId,
    circuitJson,
    converterVersion,
    routedFileName,
    sourceLabel,
    srj,
  }
}

async function loadProblemPayload(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Unable to fetch the route fixture (${response.status}).`)
  }

  return response.json()
}

function normalizeCircuitJsonForSimpleRouteJson(
  circuitJson: CircuitJsonElement[],
) {
  return circuitJson
    .filter(
      (element) =>
        element.type !== "pcb_trace" &&
        element.type !== "pcb_copper_pour" &&
        element.type !== "pcb_via",
    )
    .map((element) => {
      if (
        element.type !== "pcb_board" ||
        "center" in element ||
        !Array.isArray(element.outline) ||
        element.outline.length === 0
      ) {
        return element
      }

      const xs = element.outline.map((point: { x: number }) => point.x)
      const ys = element.outline.map((point: { y: number }) => point.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      return {
        ...element,
        center: {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        },
        width: element.width ?? maxX - minX,
        height: element.height ?? maxY - minY,
      }
    })
}

export async function loadExampleProblem(exampleId: ProblemExampleId) {
  const example = getProblemExample(exampleId)
  const payload = await loadProblemPayload(example.url)
  const { reportId, srj, title } = extractRouteProblem(payload)

  return createLoadedProblem({
    displayName: example.displayName || title?.trim() || "Route example",
    exampleId: example.id,
    reportId,
    sourceLabel: example.sourceLabel,
    srj: example.transform ? example.transform(srj) : srj,
  })
}

export async function loadDefaultProblem() {
  return loadExampleProblem(DEFAULT_PROBLEM_EXAMPLE_ID)
}

export async function loadProblemFromFile(file: File) {
  const payload = JSON.parse(await file.text()) as unknown
  const { reportId, srj, title } = extractRouteProblem(payload)

  return createLoadedProblem({
    displayName:
      title?.trim() ||
      file.name.replace(/\.json$/i, "") ||
      "Uploaded route problem",
    reportId,
    sourceLabel: file.name,
    srj,
  })
}

export async function loadProblemFromKicadFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".kicad_pcb")) {
    throw new Error("Choose a KiCad PCB file ending in .kicad_pcb.")
  }

  const [{ module: converterModule, version }, fileContents] =
    await Promise.all([loadLatestKicadToCircuitJson(), file.text()])

  if (typeof converterModule.KicadToCircuitJsonConverter !== "function") {
    throw new Error(
      "The latest kicad-to-circuit-json package is missing its converter export.",
    )
  }

  const converter = new converterModule.KicadToCircuitJsonConverter()
  converter.addFile(file.name, fileContents)
  converter.runUntilFinished()

  const warnings = converter.getWarnings()

  if (warnings.length > 0) {
    console.warn("KiCad conversion warnings:", warnings)
  }

  const circuitJson = converter.getOutput() as CircuitJsonElement[]
  const simpleRouteJson = createRouteProblemFromCircuitJson(
    normalizeCircuitJsonForSimpleRouteJson(circuitJson),
  )

  if (!isRouteProblem(simpleRouteJson)) {
    throw new Error(
      "The uploaded KiCad PCB could not be converted into a routable board.",
    )
  }

  return createLoadedProblem({
    circuitJson,
    converterVersion: version,
    displayName:
      file.name.replace(/\.kicad_pcb$/i, "").trim() || "Uploaded KiCad PCB",
    routedFileName: file.name.replace(/\.kicad_pcb$/i, "-routed.kicad_pcb"),
    sourceLabel: file.name,
    srj: simpleRouteJson,
  })
}
