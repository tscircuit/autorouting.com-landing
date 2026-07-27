import importer from "@tscircuit/internal-dynamic-import"

const NPM_REGISTRY_BASE_URL = "https://registry.npmjs.org"

const latestVersionPromises = new Map<string, Promise<string>>()

type RuntimePackage<TModule> = {
  module: TModule
  version: string
}

type KicadToCircuitJsonModule = {
  KicadToCircuitJsonConverter: new () => {
    addFile: (filePath: string, content: string) => void
    runUntilFinished: () => void
    getOutput: () => Array<Record<string, unknown>>
    getWarnings: () => string[]
  }
}

type CircuitJsonToKicadModule = {
  CircuitJsonToKicadPcbConverter: new (
    circuitJson: Array<Record<string, unknown>>,
  ) => {
    runUntilFinished: () => void
    getOutputString: () => string
  }
}

export type CapacityAutorouterModule<TSolver> = {
  AutoroutingPipelineSolver7_MultiGraph?: new (
    srj: Record<string, unknown>,
  ) => TSolver
}

async function resolveLatestPackageVersion(packageName: string) {
  const existingPromise = latestVersionPromises.get(packageName)

  if (existingPromise) {
    return existingPromise
  }

  const versionPromise = fetch(
    `${NPM_REGISTRY_BASE_URL}/${encodeURIComponent(packageName)}/latest`,
    {
      cache: "no-store",
    },
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Unable to resolve the latest ${packageName} version (${response.status}).`,
        )
      }

      const metadata = (await response.json()) as {
        version?: unknown
      }

      if (typeof metadata.version !== "string" || !metadata.version.trim()) {
        throw new Error(
          `The npm registry did not return a version for ${packageName}.`,
        )
      }

      return metadata.version
    })
    .catch((error) => {
      latestVersionPromises.delete(packageName)
      throw error
    })

  latestVersionPromises.set(packageName, versionPromise)
  return versionPromise
}

export async function loadLatestKicadToCircuitJson(): Promise<
  RuntimePackage<KicadToCircuitJsonModule>
> {
  const version = await resolveLatestPackageVersion("kicad-to-circuit-json")
  const module = (await importer(
    `kicad-to-circuit-json@${version}`,
  )) as KicadToCircuitJsonModule

  return { module, version }
}

export async function loadLatestCircuitJsonToKicad(): Promise<
  RuntimePackage<CircuitJsonToKicadModule>
> {
  const version = await resolveLatestPackageVersion("circuit-json-to-kicad")
  const module = (await importer(
    `circuit-json-to-kicad@${version}`,
  )) as CircuitJsonToKicadModule

  return { module, version }
}

export async function loadLatestCapacityAutorouter<TSolver>(): Promise<
  RuntimePackage<CapacityAutorouterModule<TSolver>>
> {
  const packageName = "@tscircuit/capacity-autorouter"
  const version = await resolveLatestPackageVersion(packageName)
  const module = (await importer(
    `${packageName}@${version}`,
  )) as CapacityAutorouterModule<TSolver>

  return { module, version }
}
