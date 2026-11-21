# Mission Island visual review

Delegate review of every visual artifact to the [Mission Island Art Director](.agents/skills/mission-island-art-director/SKILL.md) before handoff. Apply the review to improve the artifact, then check gameplay assets and interactions in the game or Workbench at the scale where players see them.

# Numeric literals

Use named constants for settings in the runtime module that owns them. Put authored dimensions, shader presets, effect and audio recipes, and other numeric tables in the [approved data locations](CONTRIBUTING.md#quality-checks). Keep those modules declarative. Workbench studies should import the same production models, shaders, and attachment data. Prune the ESLint baseline after cleanup and leave new findings visible.
