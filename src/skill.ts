import { FileSystemAdapter, Notice, Platform, type Plugin } from "obsidian";
import { markerOf, planExtract, type SkillFiles } from "./extract";
import embedded from "./skill-files.gen.json";

/**
 * Extracts the embedded skill to <plugin dir>/skill/ in the desktop app when its marker differs.
 * Files go to skill.tmp/ first and replace skill/ by a rename; the marker is written last, so a failed run is
 * retried on the next load.
 */
export async function extractSkill(plugin: Plugin): Promise<void> {
	const adapter = plugin.app.vault.adapter;
	if (!Platform.isDesktopApp || !(adapter instanceof FileSystemAdapter)) return;
	const { files, hash } = embedded as SkillFiles;
	const dir = plugin.manifest.dir ?? "";
	// A plugin folder linked to a checkout of this repository has package.json: its skill/ is the source itself,
	// which extraction would replace (dropping tests/), and it already is the body the agent reads.
	if (await adapter.exists(`${dir}/package.json`)) return;
	const skill = `${dir}/skill`;
	const tmp = `${dir}/skill.tmp`;
	const markerPath = `${skill}/.version`;
	const marker = markerOf(plugin.manifest.version, hash);
	const current = (await adapter.exists(markerPath))
		? await adapter.read(markerPath)
		: null;
	const writes = planExtract(files, marker, current);
	if (!writes) return;
	try {
		if (await adapter.exists(tmp)) await adapter.rmdir(tmp, true);
		const dirs = new Set(
			writes.map(([path]) => `${tmp}/${path}`.replace(/\/[^/]+$/, "")),
		);
		for (const d of [...dirs].sort()) await adapter.mkdir(d);
		for (const [path, text] of writes)
			await adapter.write(`${tmp}/${path}`, text);
		if (await adapter.exists(skill)) await adapter.rmdir(skill, true);
		await adapter.rename(tmp, skill);
		await adapter.write(markerPath, `${marker}\n`);
	} catch (e) {
		console.error("session-supervisor: skill extraction failed", e);
		new Notice(`Session Supervisor: skill extraction failed: ${e}`);
		return;
	}
	if (current !== null) {
		new Notice(
			`Session Supervisor skill updated to ${plugin.manifest.version}. Restart running sv sessions with \`sv.sh restart\`.`,
		);
	}
}
