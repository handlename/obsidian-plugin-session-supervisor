export interface SkillFiles {
	files: Record<string, string>;
	hash: string;
}

export const markerOf = (version: string, hash: string) => `${version}+${hash}`;

/**
 * The files to write into skill/, or null when the extracted copy already carries this marker.
 * The marker includes the content hash, so a rebuild without a version change is extracted again.
 */
export function planExtract(
	files: Record<string, string>,
	marker: string,
	current: string | null,
): [string, string][] | null {
	if (current?.trim() === marker) return null;
	return Object.entries(files);
}
