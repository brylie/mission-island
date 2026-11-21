# Field journal

Press **J** or the **Field journal** button to open the crew’s journal. It has pages for fish, places, nature, and Mara’s outing.

Each line starts with a clue. A recorded line can show the day, time of day, weather, place, and who noted it. Each unique line earns one observation XP for the crew. The first record stands, and the journal keeps earlier discoveries even when their original details are unknown.

## How a line gets recorded

| Page | What it lists | How it is recorded |
| --- | --- | --- |
| Fish | Five named fish | Land one. |
| Places | Six named places and the four kinds of country in the north | Walk there. |
| Places | Forest Lookout and the ferry terminal | Aim at it and press **E**. |
| Nature | The Driftwood fish school, Juniper hares, foxes and clover, dock gulls, and the fallen willow at Mirror Pool | Aim at it and press **E**. |
| Mara’s outing | Eight observations at Driftwood Beach, Shellglass Tide Pool and Juniper Hollow | Follow Mara’s clues and press **E** when the inspection or behavior prompt appears. |

Aiming works from up to 14 metres. The reticle tip names the subject and offers **Record in journal**. If you stand within 3 metres of a subject and no other prompt is showing, **E** records it without an aim. This keeps recording possible in the island view and without mouse look.

Some animals also have behaviors to record. They appear under the animal once it is in the journal. Aim at the animal while it is doing one of them and the tip offers **Add this behavior to the journal**.

| Animal | Behaviors |
| --- | --- |
| Driftwood fish school | Regrouping after a scare |
| Juniper hare | Grazing, fleeing, sheltering |
| Juniper fox | Patrolling, watching |
| Dock gull | Resting on a pile, gliding over the water |

## Mara’s outing

Talk to Mara at the fishing dock. Both players can reread her landmark directions under **Mara’s outing**. One player can head toward Shellglass while the other visits Juniper Hollow. Once either player records an outing observation, Mara recognizes the crew’s work and suggests returning in a downpour to watch a hare shelter.

Walking into Shellglass or Juniper records the place. Read the tide staff or cairn to confirm that place on the outing checklist. The journal keeps both times on the same place entry, with one shared XP. Reading the tide staff again shows the current phase. The outing page retains the phase from the first inspection.

Any clover patch can be recorded on the Nature page. Inspect the grazed patch by the trail to confirm it on the outing. For the sheltering observation, look for a hare taking cover during heavy rain.

## Which fish bites

A landed fish still counts as one fish in your goods and sells for the same price. Its name depends on when and where the cast lands. There is no dice roll, so the same cast lands the same fish.

| Fish | When and where |
| --- | --- |
| Lantern eel | Any water after dark |
| Rain smelt | Any water by day while a shower is falling |
| Channel mackerel | From the skiff on a dry day |
| Sand dab | Off Driftwood Beach on a dry day |
| Shore perch | The dock and any other shore on a dry day |

The first match from the top wins. The catch notice names the fish.

## Sharing and saving

Either player can record a line and both see it at once. A notice names the entry and, for your partner's records, who made it. A named place is ticked for the crew when either player first walks there. Each player's own map label and minimap dot still appear only after their own visit.

The host checks each request against the current subject, including sightline and behavior on the outing. Simultaneous observations share one entry. The host saves the journal with the island and sends the same version to both players.

The save uses one versioned `world.journal` with an entry map and Mara’s clue flag. Each entry holds the first general record, the first outing observation, or both. Loading either earlier journal format converts it to this version, and pre-journal saves import their known places. The host derives both counts from the entries.

## Playtest

- Land a fish from the dock by day, then again after dark. Check that the notice names each fish, that both appear on the Fish page for both players, and that a second shore perch leaves the first note unchanged.
- Walk one player to Juniper Hollow. Check that the place and "Pine forest" are ticked for both players, and that only the walker's map shows the label.
- Aim at a resting dock gull and press **E**. Wait for a gull to glide, aim again and add the behavior.
- Have both players aim at the fallen willow and press **E** together. Check for one entry with one name on it.
- Start `field-outing` with two players and follow both clues. Compare both journals after the dry visit, the heavy-rain revisit and reconnect. Check the same eight outing observations after a disk-backed host restart.
- Restart the host, rejoin with both browsers and compare the pages and the tally.
- Edge case: record the fallen willow from the island view with mouse look off, by walking up to it. Then try the same beside the skiff, where **F** already has a prompt, and check that **E** does nothing until you aim.
