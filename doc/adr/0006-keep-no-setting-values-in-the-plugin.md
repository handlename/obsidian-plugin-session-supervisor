# 6. Keep no setting values in the plugin

Date: 2026-11-21

## Status

Accepted

## Context

The root, templates, and dashboard locations are already recorded in ## Locations of each <dir>/CLAUDE.md, and production has two roots.

Alternative considered: a settings tab with one saved value per field. Rejected: the same setting would live in two places.

## Decision

The settings tab holds only a Setup button. It opens a Modal asking for root, templates, and dashboard (default <root>/Supervisor.md), creates the root folder, and creates the dashboard if it is missing. Nothing is saved. The commands derive the root from the note's folder by stripping a trailing /YYYY/MM.

## Consequences

- No setting can drift from CLAUDE.md.
- With several roots, the user runs Setup once per root and types the values each time.
