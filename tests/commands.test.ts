import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
	MarkdownView: class {},
	Notice: class {},
	parseYaml: (s: string) =>
		Object.fromEntries(s.split("\n").map((l) => l.split(": "))),
	getFrontMatterInfo: (text: string) => {
		const m = /^---\n([\s\S]*?)\n---/.exec(text);
		return { exists: Boolean(m), frontmatter: m?.[1] ?? "" };
	},
}));

const calls: string[] = [];
const pick = vi.fn();
vi.mock("../src/ui", () => ({
	closeRenamePrompts: () => calls.push("closeRenamePrompts"),
	pick: (...args: unknown[]) => {
		calls.push("pick");
		return pick(...args);
	},
	prompt: async () => {
		calls.push("prompt");
		return "New project";
	},
}));

const { setTitleAndProject } = await import("../src/commands");

type Fm = Record<string, unknown>;
const fakeFile = (path: string, fm: Fm) => {
	const i = path.lastIndexOf("/");
	const name = path.slice(i + 1);
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ""),
		parent: { path: i < 0 ? "/" : path.slice(0, i) },
		fm,
	};
};

function fakeApp(active: ReturnType<typeof fakeFile>) {
	const others = [
		fakeFile("sv/personal/2026/10/a.md", {
			tags: ["supervised", "project"],
			project_id: "P-0001",
		}),
		fakeFile("sv/work/2026/10/b.md", {
			tags: ["supervised"],
			task_id: "T-0001",
		}),
	];
	const renamed: string[] = [];
	const created: string[] = [];
	const app = {
		workspace: { getActiveFile: () => active },
		metadataCache: {
			getFileCache: (f: { fm: Fm }) => ({ frontmatter: f.fm }),
		},
		vault: {
			getMarkdownFiles: () => [active, ...others],
			read: async () => `---\nuid: ${active.fm.uid}\n---\n`,
			getAbstractFileByPath: () => null,
			getFolderByPath: () => null,
			createFolder: async (p: string) => created.push(p),
		},
		fileManager: {
			processFrontMatter: async (f: { fm: Fm }, fn: (fm: Fm) => void) =>
				fn(f.fm),
			renameFile: async (_f: unknown, dest: string) => renamed.push(dest),
		},
	};
	return { app, renamed, created };
}

describe("setTitleAndProject", () => {
	beforeEach(() => {
		pick.mockReset();
		calls.length = 0;
	});

	it("asks a project note at the vault top for its root, not a project", async () => {
		const note = fakeFile("Untitled.md", {
			tags: ["supervised", "project"],
			uid: "20261123_100000",
		});
		const { app, renamed } = fakeApp(note);
		pick.mockResolvedValueOnce("sv/work");
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(pick).toHaveBeenCalledTimes(1);
		expect(pick.mock.calls[0][1]).toEqual(["sv/personal", "sv/work"]);
		expect(note.fm.title).toBe("New project");
		expect(note.fm).not.toHaveProperty("parent");
		const now = new Date();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		expect(renamed).toEqual([
			`sv/work/${now.getFullYear()}/${month}/20261123_100000.md`,
		]);
	});

	it("changes nothing when the root picker is cancelled", async () => {
		const note = fakeFile("Untitled.md", { tags: ["supervised", "project"] });
		const { app, renamed } = fakeApp(note);
		pick.mockResolvedValueOnce(null);
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(note.fm).not.toHaveProperty("title");
		expect(renamed).toEqual([]);
	});

	it("still asks a task note for its project after the root", async () => {
		const note = fakeFile("Untitled.md", {
			tags: ["supervised"],
			uid: "u1",
		});
		const { app } = fakeApp(note);
		pick.mockResolvedValueOnce("sv/personal").mockResolvedValueOnce({
			f: { path: "sv/personal/2026/10/a.md", basename: "a" },
			fm: { project_id: "P-0001", title: "A" },
		});
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(calls).toEqual(["closeRenamePrompts", "pick", "pick", "prompt"]);
		expect(note.fm.parent).toBe("[[sv/personal/2026/10/a|A]]");
	});
});
