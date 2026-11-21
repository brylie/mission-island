export interface ScenarioSummary {
  id: string
  title: string
  island: string
}

export interface TrialRun {
  checkpoint: string
  seats: 1 | 2
  revision: number
}

export interface LiveTrial extends TrialRun {
  started: boolean
}
