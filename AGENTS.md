# Mission Island visual review

Delegate review of every visual artifact to the [Mission Island Art Director](.agents/skills/mission-island-art-director/SKILL.md) before handoff. Apply the review to improve the artifact, then check gameplay assets and interactions in the game or Workbench at the scale where players see them.

# Numeric literals

Use named constants for settings in the runtime module that owns them. Put authored dimensions, shader presets, effect and audio recipes, and other numeric tables in the [approved data locations](CONTRIBUTING.md#quality-checks). Keep those modules declarative. Workbench studies should import the same production models, shaders, and attachment data. Keep numeric lint findings visible by keeping the repository free of ESLint suppressions.

# Document what we learn

Treat the docs as a knowledge base for students, teachers, parents, researchers, scientists, developers and players. When a change adds or alters a design choice, mechanic, contract, tool, or anything drawn from the real world, update the matching page in the same change. Real-world topics include species, habitats, geology, weather, seasons, first aid and practical skills. Documentation may be larger than the code. The knowledge is often the more lasting contribution. The [Knowledge Keeper](.agents/skills/mission-island-knowledge-keeper/SKILL.md) reviews this in every verify loop, and the [field guide](docs/field-guide/README.md) holds real-world entries.

# Verify before handoff

Before handing off a change or opening a PR, follow the [verify skill](.agents/skills/verify/SKILL.md) (`/verify` in Claude Code). It runs the static checks, exercises the change in the game or Workbench, and sends the diff to the reviewers it calls for until they agree.
