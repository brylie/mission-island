import { renderJob, type Rendered } from './recipes.ts'

export type RecipeRenderer = { render(rendered: Rendered): Promise<Float32Array>, dispose(): void }

// Renders on the calling thread. Tests use it, and it is the fallback when a worker cannot start.
export function inlineRenderer(): RecipeRenderer {
  return { render: (rendered) => Promise.resolve(renderJob(rendered.job)), dispose() {} }
}

// Renders in a dedicated worker so generating a buffer never stalls a frame.
export function workerRenderer(): RecipeRenderer {
  let worker: Worker | null
  try {
    worker = new Worker(new URL('./recipe-worker.ts', import.meta.url), { type: 'module' })
  }
  catch {
    return inlineRenderer()
  }
  let next = 0
  const waiting = new Map<number, { rendered: Rendered, resolve: (samples: Float32Array) => void }>()
  worker.onmessage = ({ data }: MessageEvent<{ id: number, samples: Float32Array }>) => {
    waiting.get(data.id)?.resolve(data.samples)
    waiting.delete(data.id)
  }
  // If the worker fails, finish what it was holding inline and render inline from then on.
  worker.onerror = () => {
    worker?.terminate()
    worker = null
    for (const { rendered, resolve } of waiting.values()) resolve(renderJob(rendered.job))
    waiting.clear()
  }
  return {
    render(rendered) {
      if (!worker) return Promise.resolve(renderJob(rendered.job))
      const id = ++next
      return new Promise((resolve) => {
        waiting.set(id, { rendered, resolve })
        worker!.postMessage({ id, job: rendered.job })
      })
    },
    dispose() {
      worker?.terminate()
      worker = null
      waiting.clear()
    },
  }
}
