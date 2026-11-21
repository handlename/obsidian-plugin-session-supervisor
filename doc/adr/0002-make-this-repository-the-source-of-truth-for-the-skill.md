# 2. Make this repository the source of truth for the skill

Date: 2026-11-21

## Status

Accepted

Amended by [8. Distribute the thin SKILL.md from this repository](0008-distribute-the-thin-skill-md-from-this-repository.md)

## Context

The session-supervisor skill lived in handlename/agent-skills. Installing or updating it meant installing and configuring Templater, binding hotkeys for its scripts (sv-status.md, sv-project.md), enabling a CSS snippet, and copying files from the skill by hand.

Alternatives considered:

- Keep the skill in agent-skills and let the plugin hold only the commands and CSS. Rejected: the transition table and the guards would not be aligned with the note format in the same release.
- Carry the git history over with filter-repo or subtree. Rejected: rewritten commits lose their signatures, and every commit must be signed.

## Decision

This repository is the source of truth for the skill (SKILL.md, references, scripts/state_tool.py, tests, assets) under skill/. The first commit imports skill/ as a snapshot of handlename/agent-skills@a244f03 and names that hash in its message. agent-skills keeps only a thin SKILL.md that points to the copy the plugin extracts, and goes to 1.0.0.

## Consequences

- Installation becomes: install the plugin with BRAT, enable it, and run Setup.
- Blame cannot follow the old history here; it stays in agent-skills.
- The agent reads the skill body with Read instead of the Skill tool, so the thin SKILL.md needs rules for reading it to the end and re-reading it after compaction.
