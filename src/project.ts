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
