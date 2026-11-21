# 8. Distribute the thin SKILL.md from this repository

Date: 2026-11-21

## Status

Accepted

Amends [2. Make this repository the source of truth for the skill](0002-make-this-repository-the-source-of-truth-for-the-skill.md)

## Context

ADR 0002 left a thin SKILL.md in handlename/agent-skills that points the agent to the skill body the plugin extracts. The body, the plugin, and the pointer would then be released from two repositories, and the pointer's rules (where the body is, how to read it) belong to this repository's layout.

Alternatives considered:

- Keep the thin SKILL.md in agent-skills (ADR 0002). Rejected: two repositories to release for one change of the layout.
- Distribute the whole skill body as a Claude Code skill and drop the extraction. Rejected: mobile and Obsidian-only machines still need the commands and styles, and the body would again be released apart from the note format the plugin's commands depend on.

## Decision

This repository is also a Claude Code plugin marketplace (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`). Its plugin `session-supervisor` holds only the thin `skills/session-supervisor/SKILL.md`, whose frontmatter is the skill's description and whose body tells the agent to read `<vault>/.obsidian/plugins/session-supervisor/skill/SKILL.md`. tagpr bumps both manifests with `manifest.json`. agent-skills drops session-supervisor entirely.

## Consequences

- One repository and one version for the plugin, the skill body, and the pointer.
- The repository holds two skill directories: `skill/` (the body, embedded in main.js) and `skills/session-supervisor/` (the pointer that Claude Code installs).
- Users install the skill from this marketplace instead of agent-skills.
