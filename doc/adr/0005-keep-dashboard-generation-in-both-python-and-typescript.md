# 5. Keep dashboard generation in both Python and TypeScript

Date: 2026-11-21

## Status

Accepted

## Context

The plugin's setup creates the kanban dashboard, and state_tool.py's setup creates it too. The plugin cannot call Python (mobile has none), and Python still needs the kanban base for the project tasks section.

Alternatives considered:

- Move generation to TypeScript and delete it from Python. Rejected: _kanban_base stays in Python anyway, so the format would be split with no drift detection.
- Call python3 from the plugin. Rejected: does not work on mobile and needs a configured path.
- Port the legacy dashboard update to TypeScript, or abolish it.

## Decision

Python's supervisor_note stays as is, and src/dashboard.ts ports the same logic. pytest checks Python's output and vitest checks TypeScript's output against skill/tests/fixtures/dashboard-*.md. Updating an unedited legacy dashboard stays in Python's setup; the plugin's setup only creates a dashboard when it is missing.

## Consequences

- The kanban format is held in two languages, but CI detects drift.
- Old vaults are still refreshed by state_tool.py setup.
