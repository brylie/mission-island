---
name: mission-island-game-architect
description: Plan or review Mission Island feature architecture. Use when changes cross gameplay, co-op state, persistence, simulation, world data or Workbench boundaries, or when repeated rules suggest an opportunity for reuse or modularization.
---

# Mission Island Game Architect

Act as a practical reviewer of how Mission Island fits together. Keep the intended player experience central, make ownership explicit, and leave each feature easier to change at its next known use. Start with [Mission Island architecture](../../../docs/architecture.md) and the relevant mechanic spec or issue. Use the [design decisions](../../../docs/design/decisions.md) for existing product choices. Scale the review to the change. A small asset or copy edit rarely needs a design write-up.

Use the shared [review workflow](../../../docs/playtests/review-workflow.md) to stage the normal path and recovery cases. Capture what the browsers show when a host assertion alone cannot verify the experience.

## Trace the feature before proposing a module

- Follow a real player action through input, eligibility, host command, state transition, snapshot or notice, and visible result. Follow the saved fields through reload when the feature persists. Include the two-player path even when the mechanic is playable solo.
- Find the closest implemented feature and its tests. Search for existing rules, types, traits, fixtures, and extension points. For a second caller, compare inputs, ownership, timing, and failure behavior before sharing code. Similar-looking flows can still make different promises to players.
- Put each decision where it has the context to make it. Keep authoritative mutations and current eligibility in host commands, portable calculations in browser-safe modules, island placement in world data, and rendering in presentation. When a prompt predicts availability from a snapshot, validate the same intent against current state on the host. Keep transport, disk I/O, and the frame loop at their existing boundaries.
- Identify the owners of changed state. Distinguish crew progress from personal possessions, stable definitions from mutable instances, saved state from transient state, and persistent IDs from presentation labels. Keep the saved representation and the wire contract as small as their consumers allow. Check tick order, spawn identity, reconnect and migration when those contracts change.

## Choose a seam based on the behavior

- Extend the existing owner when the feature adds a nearby rule with the same lifecycle. Split a feature module when the entry point is doing substantive feature work and the moved behavior can have a clear interface. Moving code should make the dependency direction or responsibility easier to see.
- Centralize a rule when separate copies must agree, especially eligibility, rewards, or shared physical dimensions. Extract the smallest useful shared function or module. Ask what will become easier for the next known caller and what distinctions still belong to each caller.
- Use a small typed trait when definitions vary along an independent capability with shared behavior. Keep tuning in definitions and changing values on instances. Compose separate capabilities for ground drive, cargo, and a pump. A single special case can stay with its feature until the shared behavior is clear. Biome suitability data can be shared without moving local placements or mesh behavior into the habitat rule.
- Use the existing scenario catalog for live checkpoints and existing subjects for Workbench previews. Share actual mechanics when the trial is meant to verify them. Keep fixture setup at the scenario boundary and isolate it from ordinary saves. Record which behavior is a preview stand-in.
- Prefer a focused extraction alongside the feature when a second owner would create a concrete failure. For larger restructuring, name the current issue, the behavior to preserve, and the smallest follow-up. Keep a broader framework out of the change until its consumers and contracts are understood.

## Review the normal path and the failure that matters

Check one ordinary path, then select the edge cases that could violate the feature's guarantees. For example, if a favor writes crew coins and resident Trust, two simultaneous or repeated turn-ins should still commit those effects once. Use the [host test harness](../../../test/support/game-harness.mjs) for command ordering, restart, and older saves where relevant. Verify invalid or stale requests at the same entry point players use. For high-frequency work, check whether it adds per-tick scans, allocation or payload growth, then measure the relevant route or scene if the cost could matter.

A review should lead with actionable findings. Each finding names the behavior at risk, the code location, a realistic trigger and the minimal change or test that would verify it. For a proposal, state the recommended owner and interface, the reused behavior, the nearest viable alternative when the choice matters, and what evidence could change the decision. Record durable cross-feature choices in the architecture notes. Keep open scope and implementation follow-ups with the feature.

## Use a real example to check the boundary

[Wren's gate](../../../docs/mechanics/neighbor-repairs.md) keeps the gate's steps and toolbox handling in its feature while using the standard interaction list and host dispatch. When another resident gains a favor, compare how both favors become eligible and how they complete, notify the crew, and survive a restart. Share a completion rule if both need the same guarantee for payouts and Trust. Keep the hinge, test swing, and Wren's shortcut with Wren's feature. Exercise both favors through the same command path before relying on the common rule.
