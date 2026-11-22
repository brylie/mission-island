export const fullCheckpointCrewSeats = 2

export interface ScenarioSummary {
  id: string
  title: string
  island: string
}

export interface TrialRun {
  checkpoint: string
  seats: 1 | typeof fullCheckpointCrewSeats
  revision: number
}

export interface LiveTrial extends TrialRun {
  started: boolean
}
