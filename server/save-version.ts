// Historical save versions are also the input to the next migration.
const sharedCrewBank = 2
const gateRepair = 3
const residentFavor = 4
const ferryRepair = 5
const residentStanding = 6
const fireWatch = 7
const rescueGear = 8

export const saveVersions = { sharedCrewBank, gateRepair, residentFavor, ferryRepair, residentStanding, fireWatch, rescueGear } as const
export const currentSaveVersion = saveVersions.rescueGear
