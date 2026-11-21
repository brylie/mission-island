import { renderJob, type RecipeJob } from './recipes'

// Renders recipe buffers off the UI thread and hands the samples back without copying.
type Request = { id: number; job: RecipeJob }
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null
  postMessage(message: unknown, transfer: Transferable[]): void
}

scope.onmessage = ({ data }) => {
  const samples = renderJob(data.job)
  scope.postMessage({ id: data.id, samples }, [samples.buffer])
}
