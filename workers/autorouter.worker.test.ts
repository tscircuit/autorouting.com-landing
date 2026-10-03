import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { applyArduinoUnoStaticSrjAdjustments } from "@/lib/autorouter/arduino-uno-static-srj"
import type {
  AutorouterWorkerInbound,
  AutorouterWorkerOutbound,
  RouteProblem,
} from "@/lib/autorouter/types"

test("the worker routes the landing example without runtime network requests", { timeout: 120_000 }, async () => {
  const fixture = JSON.parse(await readFile(
    new URL("../public/fixtures/default-autorouter-problem.json", import.meta.url),
    "utf8",
  )) as { simple_route_json: RouteProblem }
  const originalFetch = globalThis.fetch
  const originalSelf = Object.getOwnPropertyDescriptor(globalThis, "self")
  const messages: AutorouterWorkerOutbound[] = []
  let finish: (message: AutorouterWorkerOutbound) => void = () => {}
  const terminalMessage = new Promise<AutorouterWorkerOutbound>((resolve) => {
    finish = resolve
  })
  const workerScope = {
    onmessage: null as ((event: { data: AutorouterWorkerInbound }) => void) | null,
    postMessage(message: AutorouterWorkerOutbound): void {
      messages.push(structuredClone(message))
      if (message.type === "error" || message.snapshot.solved || message.snapshot.failed) {
        finish(message)
      }
    },
  }

  globalThis.fetch = async () => {
    throw new Error("Routing must not fetch packages at runtime")
  }
  Object.defineProperty(globalThis, "self", { configurable: true, value: workerScope })
  try {
    await import("./autorouter.worker")
    assert.ok(workerScope.onmessage)
    workerScope.onmessage({ data: {
      type: "start",
      srj: applyArduinoUnoStaticSrjAdjustments(fixture.simple_route_json),
    } })
    const result = await terminalMessage
    assert.notEqual(result.type, "error", JSON.stringify(result))
    if (result.type === "error") return
    assert.equal(result.snapshot.failed, false, result.snapshot.error ?? "")
    assert.equal(result.snapshot.solved, true)
    assert.ok(result.snapshot.outputSrj?.traces?.length)
    assert.ok(result.snapshot.view.lines?.length)
    assert.equal(messages[0].type, "started")
    assert.ok(messages.some((message) => message.type === "snapshot" && !message.snapshot.solved))
  } finally {
    globalThis.fetch = originalFetch
    if (originalSelf) {
      Object.defineProperty(globalThis, "self", originalSelf)
    } else {
      Reflect.deleteProperty(globalThis, "self")
    }
  }
})
