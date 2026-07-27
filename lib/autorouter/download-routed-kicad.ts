import { loadLatestCircuitJsonToKicad } from "@/lib/autorouter/runtime-packages"
import type {
  CircuitJsonElement,
  LoadedRouteProblem,
  RouteProblem,
  RouteThroughObstacle,
} from "@/lib/autorouter/types"

function convertThroughObstacleForKicad(point: RouteThroughObstacle) {
  return {
    route_type: "through_pad",
    start: point.start,
    end: point.end,
    start_layer: point.from_layer,
    end_layer: point.to_layer,
    width: point.width,
  }
}

function getRoutedCircuitJson(
  problem: LoadedRouteProblem,
  routedProblem: RouteProblem,
) {
  if (!problem.circuitJson) {
    throw new Error("Upload a KiCad PCB before downloading a routed board.")
  }

  const unroutedCircuitJson = problem.circuitJson.filter(
    (element) => element.type !== "pcb_trace" && element.type !== "pcb_via",
  )
  const routedTraces = (routedProblem.traces ?? []).map(
    (trace, index): CircuitJsonElement => {
      const connectionName =
        typeof trace.connection_name === "string"
          ? trace.connection_name
          : undefined

      return {
        ...trace,
        type: "pcb_trace",
        pcb_trace_id:
          typeof trace.pcb_trace_id === "string"
            ? trace.pcb_trace_id
            : `autorouted_trace_${index}`,
        // circuit-json-to-kicad uses this key to attach generated segments and
        // vias to the corresponding KiCad net.
        subcircuit_connectivity_map_key:
          trace.subcircuit_connectivity_map_key ?? connectionName,
        route: trace.route.map((point) =>
          point.route_type === "through_obstacle"
            ? convertThroughObstacleForKicad(point)
            : point,
        ),
      }
    },
  )

  return [...unroutedCircuitJson, ...routedTraces]
}

function downloadTextFile(contents: string, fileName: string) {
  const blob = new Blob([contents], {
    type: "application/x-kicad-pcb;charset=utf-8",
  })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 0)
}

export async function downloadRoutedKicad({
  problem,
  routedProblem,
}: {
  problem: LoadedRouteProblem
  routedProblem: RouteProblem
}) {
  const { module, version } = await loadLatestCircuitJsonToKicad()
  const Converter = module.CircuitJsonToKicadPcbConverter

  if (typeof Converter !== "function") {
    throw new Error(
      "The latest circuit-json-to-kicad package is missing its PCB converter.",
    )
  }

  const converter = new Converter(getRoutedCircuitJson(problem, routedProblem))
  converter.runUntilFinished()

  console.info(
    `Exported routed KiCad PCB with circuit-json-to-kicad@${version}`,
  )
  downloadTextFile(
    converter.getOutputString(),
    problem.routedFileName ?? "autorouted-board.kicad_pcb",
  )
}
