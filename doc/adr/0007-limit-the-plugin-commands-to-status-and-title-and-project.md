# 7. Limit the plugin commands to status and title and project

Date: 2026-11-21

## Status

Accepted

## Context

The Templater scripts provided a status shortcut and a project picker. Creating new task and project notes was also done through Templater templates.

Alternative considered: New task and New project commands. Rejected for now: they would force decisions on the target root and on uid collisions (_free_uid).

## Decision

The plugin provides two commands: change status (formerly sv-status.md) and set title and project (formerly sv-project.md). Both write frontmatter with processFrontMatter. New notes come from the core Templates plugin, whose {{date}} and {{time}} cover uid and created_at; set title and project covers the rest.

## Consequences

- No Templater is needed to operate the vault.
- Creating a task takes two steps: insert the template, then run set title and project.
- New-note commands remain a follow-up if core Templates proves inconvenient.
