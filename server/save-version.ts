// Historical save versions are also the input to the next migration.
const sharedCrewBank = 2
const gateRepair = 3
const residentFavor = 4
const ferryRepair = 5
const residentStanding = 6

export const saveVersions = { sharedCrewBank, gateRepair, residentFavor, ferryRepair, residentStanding } as const
export const currentSaveVersion = saveVersions.residentStanding
