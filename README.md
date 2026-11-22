# Session Supervisor

An Obsidian plugin for the session-supervisor skill, which runs one Claude Code supervisor session that delegates work to worker sessions and tracks every task as a note in the vault.

The plugin:

- embeds the skill (`skill/`) in `main.js` and extracts it to `<vault>/.obsidian/plugins/session-supervisor/skill/` in the desktop app,
- provides commands to change a note's status and to set its title and project,
- styles the kanban dashboard (`styles.css`),
- creates the dashboard from its settings tab (**Setup**).

## Install

1. Obsidian plugin: add `handlename/obsidian-plugin-session-supervisor` in [BRAT](https://github.com/TfTHacker/obsidian42-brat) and enable the plugin. On desktop it extracts the skill body to `<vault>/.obsidian/plugins/session-supervisor/skill/`.
2. Claude Code skill: install the thin `session-supervisor` skill (`skills/session-supervisor/SKILL.md`), which points the agent to the extracted body:

   ```text
   /plugin install session-supervisor --marketplace handlename/obsidian-plugin-session-supervisor
   ```

   On Claude Code before 2.1.275, run `/plugin marketplace add handlename/obsidian-plugin-session-supervisor` and then `/plugin install session-supervisor@session-supervisor`.

## Development

To use a checkout directly, link it as the plugin folder and build it; reload the plugin after each build:

```bash
ln -s "$PWD" <vault>/.obsidian/plugins/session-supervisor
npm ci && npm run build
```

A linked checkout has `package.json`, so the plugin skips extraction: the checkout's `skill/` is already the body the agent reads at `<vault>/.obsidian/plugins/session-supervisor/skill`.

```bash
npm ci
npm run build
npm test
python3 -m pytest skill/tests -q
```

The skill itself is documented in [skill/README.md](skill/README.md). Decisions are recorded in [doc/adr](doc/adr).
