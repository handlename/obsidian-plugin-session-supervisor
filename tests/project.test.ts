import { describe, expect, it } from "vitest";
import {
	datedFolder,
	defaultTitle,
	folderRoot,
	managedRoots,
	parentLink,
	uidPath,
} from "../src/project";

describe("project helpers", () => {
	it("strips a trailing /YYYY/MM to get the root", () => {
		expect(folderRoot("supervisor/work/2026/11")).toBe("supervisor/work");
		expect(folderRoot("supervisor/work")).toBe("supervisor/work");
		expect(folderRoot("2026/11")).toBe("");
		expect(folderRoot("/")).toBe("");
	});

	it("builds an aliased parent link", () => {
		expect(parentLink("supervisor/work/2026/11/p.md", 'A|B]"C')).toBe(
			"[[supervisor/work/2026/11/p|A B  C]]",
		);
	});

	it("offers the title or a non-default file name", () => {
		expect(defaultTitle("T", "x")).toBe("T");
		expect(defaultTitle(undefined, "Untitled 2")).toBe("");
		expect(defaultTitle(null, "memo")).toBe("memo");
	});

	it("renames to <uid>.md unless it already is or the uid is unsafe", () => {
		expect(uidPath("a/b", "Untitled", "20261110_090000")).toBe(
			"a/b/20261110_090000.md",
		);
		expect(uidPath("/", "x", "u1")).toBe("u1.md");
		expect(uidPath("a", "u1", "u1")).toBeNull();
		expect(uidPath("a", "x", "a/b")).toBeNull();
		expect(uidPath("a", "x", undefined)).toBeNull();
	});
});

describe("roots for a note outside every root", () => {
	it("lists the roots of managed notes only", () => {
		expect(
			managedRoots([
				{ folder: "supervisor/personal/2026/11", managed: true },
				{ folder: "supervisor/work", managed: true },
				{ folder: "supervisor/work/2026/10", managed: true },
				{ folder: "_plugin/templater/template/supervisor", managed: false },
			]),
		).toEqual(["supervisor/personal", "supervisor/work"]);
	});

	it("puts a new note under <root>/YYYY/MM", () => {
		expect(datedFolder("supervisor/personal", new Date(2026, 10, 22))).toBe(
			"supervisor/personal/2026/11",
		);
		expect(datedFolder("", new Date(2026, 0, 5))).toBe("2026/01");
	});
});
