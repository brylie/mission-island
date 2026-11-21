---
name: mission-island-procedural-audio
description: Design, implement, or review Mission Island’s generated ambience, spatial sound effects, and Workbench audio recipes. Use for sounds driven by terrain, motion, physics, weather, or wildlife and for listening tests across two browsers.
---

# Mission Island Procedural Audio

Start with the cause a player should hear and where they should hear it. Pair sound with the visible action or environmental condition. Read the [creative direction](../../../docs/design/creative-direction.md), the [architecture guide](../../../docs/architecture.md), and the [shared review workflow](../../../docs/playtests/review-workflow.md). Design for a quiet game two people can talk over. The [Starter Island audio pass](https://github.com/brylie/mission-island/issues/136) defines the first production slice.

## Keep the sound recipe independent of the trigger

- Give each recipe a small set of audible traits, such as wave strength, gravel crunch, or impact weight. Use seeded variation to make repeated cues related but distinguishable. Keep the waveform or parameter generation testable without a live audio device.
- Favor the browser’s [Web Audio API](https://webaudio.github.io/web-audio-api/) and the project’s existing seeded random generator. Build a small cache of short mono buffers for reusable sounds. Schedule playback in audio time with gain ramps and bounded voice counts. Measure a concrete need before introducing a dependency or custom DSP thread.
- Drive the same recipe from the Workbench and the game. Keep the actual cause in its owning system. Footsteps come from grounded motion and the supporting surface. A shared collision cue comes from host physics. Local ambience can follow position, time, and weather in each browser. Send event facts such as identity, location and strength when two players need to hear the same action.
- Use one client mix with separate ambience and effects levels and mute. Account for a suspended context before the first [browser gesture](https://developer.chrome.com/blog/web-audio-autoplay). Clean up when exiting or restarting a scene. Keep task cues available visually and check that distant emitters and rapidly repeating events cannot dominate the mix.

## Starting recipes

| Sound | Synthesis to try | What to tune by ear |
| --- | --- | --- |
| Surf | Shape filtered noise with a slower swell for the incoming body and a brighter, shorter envelope for the wash. Stagger overlapping swells with a seeded schedule and let the tail darken. | Adjust breaker strength and spacing from one listening point. Look for audible seams, static hiss, or repetitive pulsing. Then approach and leave the same spot. |
| Gravel, sand, boards | Use a short cluster of uneven ticks and a soft footfall for gravel. Favor low, filtered friction noise for sand. Add one or two damped woody tones to a short impact for boards. | Change surface and footfall strength independently at the same pace and comparable loudness. Walk across a real boundary to find timing slips or the wrong supporting surface. |
| Crate | Layer a short body thump, decaying wood modes and a little high-frequency texture at impact. Change the balance with receiving surface and map strength to a bounded gain. | Compare a gentle contact and a hard drop on the road and truck bed. Check the source position, decay, and duplicate suppression during bounce or settling. |

## Audition and verify

Use a stable seed and listener position to compare recipes at comparable loudness. Use explicit playback and stop controls. Solo an emitter or layer, then listen again in context. Save the setup with its revision, recipe settings and distance. If an audition control is missing, record the smallest control that would let another reviewer reproduce the comparison.

Run the production route with two browsers for shared sounds. At the harbor, have one player drop the crate while the other listens from near and far, then swap. Walk to Driftwood Beach and listen across surface and attenuation boundaries. Record audible timing and character separately from automated checks for finite samples, event deduplication, clean lifecycle and bounded voice count. Report the browser and listening setup, and mark any ear check that still needs a person.
