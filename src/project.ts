// Pure helpers of the "set title and project" command (formerly sv-project.md).

/** The root of a note: its folder without a trailing /YYYY/MM ("" for the vault root). */
export function folderRoot(folder: string): string {
	return (folder === "/" ? "" : folder).replace(/(^|\/)\d{4}\/\d{2}$/, "");
}

/** The `parent` value for a project note: `[[<path without .md>|<title>]]`. */
export function parentLink(path: string, title: string): string {
	return `[[${path.replace(/\.md$/, "")}|${title.replace(/[|\]"]/g, " ")}]]`;
}

/** The title to offer: the current title, else the file name unless it is an untitled default. */
export function defaultTitle(title: unknown, basename: string): string {
	if (typeof title === "string" && title) return title;
	return /^Untitled( \d+)?$/.test(basename) ? "" : basename;
}

/** The path to rename the note to (<uid>.md in the same folder), or null when it should keep its name. */
export function uidPath(
	folder: string,
	basename: string,
	uid: unknown,
): string | null {
	if (typeof uid !== "string" || !uid || uid === basename || /[\\/:]/.test(uid))
		return null;
	return `${folder && folder !== "/" ? `${folder}/` : ""}${uid}.md`;
}

/** The roots that hold notes the supervisor manages (with a task_id or project_id), sorted. Template folders hold none. */
export function managedRoots(
	notes: { folder: string; managed: boolean }[],
): string[] {
	return [
		...new Set(notes.filter((n) => n.managed).map((n) => folderRoot(n.folder))),
	].sort();
}

/** The folder a new note of root goes to: <root>/YYYY/MM, like the notes commit creates. */
export function datedFolder(root: string, date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${root ? `${root}/` : ""}${date.getFullYear()}/${month}`;
}

/**
 * The tags a project gives its tasks: its `project_tag` (a list, or a string of tags split by spaces or commas) without
 * `#` and the management tags, which would change what the task is.
 */
export function projectTags(value: unknown): string[] {
	const items = Array.isArray(value) ? value : [value];
	return [
		...new Set(
			items
				.filter((v): v is string => typeof v === "string")
				.flatMap((v) => v.split(/[\s,]+/))
				.map((t) => t.replace(/^#/, ""))
				.filter((t) => t && !["supervised", "project", "task"].includes(t)),
		),
	];
}

/** tags without the ones of removed, then the ones of added it lacks; null when nothing changes. */
export function retag(
	tags: unknown,
	removed: string[],
	added: string[],
): string[] | null {
	const old = ([] as unknown[]).concat(tags ?? []).map(String);
	const kept = old.filter((t) => added.includes(t) || !removed.includes(t));
	const next = [...kept, ...added.filter((t) => !kept.includes(t))];
	return next.length === old.length && next.every((t, i) => t === old[i])
		? null
		: next;
}
