# Session Supervisor

An Obsidian plugin for the session-supervisor skill, which runs one Claude Code supervisor session that delegates work to worker sessions and tracks every task as a note in the vault.

The plugin:

- embeds the skill (`skill/`) in `main.js` and extracts it to `<vault>/.obsidian/plugins/session-supervisor/skill/` in the desktop app,
- provides commands to change a note's status and to set its title and project,
- styles the kanban dashboard (`styles.css`),
- creates the dashboard from its settings tab (**Setup**).

## Install

Add `handlename/obsidian-plugin-session-supervisor` in [BRAT](https://github.com/TfTHacker/obsidian42-brat) and enable the plugin.

## Development

```bash
npm ci
npm run build
npm test
python3 -m pytest skill/tests -q
```

The skill itself is documented in [skill/README.md](skill/README.md). Decisions are recorded in [doc/adr](doc/adr).
