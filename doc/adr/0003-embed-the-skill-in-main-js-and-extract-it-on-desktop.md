# 3. Embed the skill in main.js and extract it on desktop

Date: 2026-11-21

## Status

Accepted

## Context

BRAT and Obsidian Sync distribute only main.js, manifest.json, and styles.css, so the skill files need another way to reach each desktop.

Alternatives considered:

- Fetch a zip from GitHub at runtime. Rejected: fails offline, and the version and content can drift.
- Attach skill.zip to the release. Rejected: BRAT and the community list fetch only the 3 files, so it never arrives.

## Decision

scripts/embed-skill.mjs generates src/skill-files.gen.json ({files: {path: text}, hash}) at build time, and esbuild bundles it into main.js. The embedded set is SKILL.md, references/**, scripts/state_tool.py, assets/chat-CLAUDE.md, and assets/sv.sh.

In onLayoutReady, when Platform.isDesktopApp and the adapter is a FileSystemAdapter, the plugin compares the marker skill/.version (<manifest.version>+<hash>) with the embedded one. On a mismatch it removes a leftover skill.tmp/, writes all files to skill.tmp/, removes skill/, renames skill.tmp to skill, and writes .version last. It then shows a Notice asking to restart running sv sessions.

## Consequences

- No network is needed and the version matches the content.
- main.js grows by about 750KB.
- The extracted files are generated output: deleting them is harmless, and a failed extraction is retried on the next load.
- After a BRAT update, running sv sessions need a restart.
