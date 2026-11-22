import { audioStudy } from './audio-study'
import { coastalModelStudies } from './coastal-model-studies'
import { islandShaderStudies } from './island-shader-studies'
import { shaderStudies } from './shader-studies'
import { schoolStudy } from './school-study'
import { biomeEntry } from './biome-preview'
import { brinewickMarketStudy } from './brinewick-market-study'
import { residentRoutinesStudy } from './resident-routines-study'
import { crewStudy } from './crew-study'
import { dyeLineupStudy } from './dye-lineup-study'
import { effectStudies } from './effect-studies'
import { farmStudy } from './farm-study'
import { gullStudy } from './gull-study'
import { furnishingStudies } from './furnishing-studies'
import { landscapeStudy } from './landscape-study'
import { materialStudies } from './material-studies'
import { mechanicStudies } from './mechanic-studies'
import { longAcreStudy } from './long-acre-study'
import { lookoutRecoveryStudy } from './lookout-recovery-study'
import { fireWatchStudy } from './fire-watch-study'
import { ridgeScoutStudy } from './ridge-scout-study'
import { natureEntries } from './nature-studies'
import { routeStudies } from './route-studies'
import { saltwindAssets } from './saltwind-studies'
import { houseStudy } from './starter-building-study'
import { starterSceneryStudies, homeChestStudy, dockStudy, buoyStudy } from './starter-prop-studies'
import type { Entry } from './subject'
import { flatbedStudy, harborBoatStudy } from './vehicle-studies'

export const entries: Entry[] = [
  flatbedStudy,
  biomeEntry,
  schoolStudy,
  ...natureEntries,
  ...coastalModelStudies,
  longAcreStudy,
  gullStudy,
  brinewickMarketStudy,
  ...mechanicStudies,
  residentRoutinesStudy,
  ...furnishingStudies,
  landscapeStudy,
  ridgeScoutStudy,
  lookoutRecoveryStudy,
  fireWatchStudy,
  crewStudy,
  dyeLineupStudy,
  ...starterSceneryStudies,
  houseStudy,
  homeChestStudy,
  farmStudy,
  dockStudy,
  harborBoatStudy,
  buoyStudy,
  ...effectStudies,
  audioStudy,
  ...routeStudies,
  ...materialStudies,
  ...shaderStudies,
  ...islandShaderStudies,
  ...saltwindAssets,
]
