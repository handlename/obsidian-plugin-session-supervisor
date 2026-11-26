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
const noteDialog = vi.fn();
vi.mock("../src/ui", () => ({
	closeRenamePrompts: () => calls.push("closeRenamePrompts"),
	noteDialog: (...args: unknown[]) => {
		calls.push("noteDialog");
		return noteDialog(...args);
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
			project_tag: ["home"],
		}),
		fakeFile("sv/personal/2026/10/c.md", {
			tags: ["supervised", "home"],
			parent: "[[sv/personal/2026/10/a|a]]",
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
			getFileCache: (f: { fm: Fm }) => ({
				frontmatter: f.fm,
				frontmatterLinks:
					typeof f.fm.parent === "string"
						? [{ key: "parent", link: f.fm.parent.slice(2, -2).split("|")[0] }]
						: [],
			}),
			getFirstLinkpathDest: (link: string) =>
				[active, ...others].find((f) => f.path === `${link}.md`) ?? null,
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
	return { app, renamed, created, others };
}

// biome-ignore lint/suspicious/noExplicitAny: the form the command passes
const submit = (change: (form: any) => object) =>
	// biome-ignore lint/suspicious/noExplicitAny: the form the command passes
	noteDialog.mockImplementationOnce(async (_app, form: any) => ({
		...form,
		...change(form),
	}));

describe("setTitleAndProject", () => {
	beforeEach(() => {
		noteDialog.mockReset();
		calls.length = 0;
	});

	it("asks a project note at the vault top for its root and title in one dialog, not a project", async () => {
		const note = fakeFile("Untitled.md", {
			tags: ["supervised", "project"],
			uid: "20261123_100000",
		});
		const { app, renamed } = fakeApp(note);
		submit(() => ({ root: "sv/work", title: "New project" }));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(calls).toEqual(["closeRenamePrompts", "noteDialog"]);
		const form = noteDialog.mock.calls[0][1];
		expect(form.roots).toEqual(["sv/personal", "sv/work"]);
		expect(form.root).toBe("sv/personal");
		expect(form.projectsOf).toBeUndefined();
		expect(form.title).toBe("");
		expect(note.fm.title).toBe("New project");
		expect(note.fm).not.toHaveProperty("parent");
		const now = new Date();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		expect(renamed).toEqual([
			`sv/work/${now.getFullYear()}/${month}/20261123_100000.md`,
		]);
	});

	it("changes nothing when the dialog is dismissed", async () => {
		const note = fakeFile("Untitled.md", { tags: ["supervised", "project"] });
		const { app, renamed } = fakeApp(note);
		noteDialog.mockResolvedValueOnce(null);
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(note.fm).not.toHaveProperty("title");
		expect(renamed).toEqual([]);
	});

	it("lists the projects of the chosen root for a task note and writes the chosen one", async () => {
		const note = fakeFile("Untitled.md", {
			tags: ["supervised"],
			uid: "u1",
		});
		const { app } = fakeApp(note);
		submit((form) => ({
			root: "sv/personal",
			project: form.projectsOf("sv/personal")[0],
			title: "T",
		}));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		const form = noteDialog.mock.calls[0][1];
		expect(form.projectsOf("sv/work")).toEqual([]);
		expect(form.projectsOf("sv/personal").map(form.projectLabel)).toEqual([
			"P-0001 a",
		]);
		expect(note.fm.parent).toBe("[[sv/personal/2026/10/a|a]]");
		expect(note.fm.title).toBe("T");
	});

	it("preselects the current project and removes it when none is chosen", async () => {
		const note = fakeFile("sv/personal/2026/11/u2.md", {
			tags: ["supervised"],
			uid: "u2",
			title: "Old",
			parent: "[[sv/personal/2026/10/a|a]]",
		});
		const { app, renamed } = fakeApp(note);
		submit(() => ({ project: null, title: " " }));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		const form = noteDialog.mock.calls[0][1];
		expect(form.root).toBe("sv/personal");
		expect(form.project.f.path).toBe("sv/personal/2026/10/a.md");
		expect(form.title).toBe("Old");
		expect(note.fm).not.toHaveProperty("parent");
		expect(note.fm.title).toBe("Old");
		expect(renamed).toEqual([]);
	});

	it("gives a task the tags of its project and drops those of the former one", async () => {
		const note = fakeFile("sv/personal/2026/10/t.md", {
			tags: ["supervised", "home", "mine"],
			parent: "[[sv/personal/2026/10/a|a]]",
		});
		const { app } = fakeApp(note);
		submit(() => ({ project: null }));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(note.fm.tags).toEqual(["supervised", "mine"]);
		expect(noteDialog.mock.calls[0][1].projectTag).toBeUndefined();
		submit(() => ({
			project: {
				f: { path: "sv/personal/2026/10/a.md", basename: "a" },
				fm: { project_id: "P-0001", project_tag: "work" },
			},
		}));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(note.fm.tags).toEqual(["supervised", "mine", "work"]);
	});

	it("shows a project its tags and retags its tasks with the new ones", async () => {
		const project = fakeFile("sv/personal/2026/10/a.md", {
			tags: ["supervised", "project"],
			project_tag: ["home"],
		});
		const { app, others } = fakeApp(project);
		submit(() => ({ projectTag: "#iot office" }));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(noteDialog.mock.calls[0][1].projectTag).toBe("home");
		expect(project.fm.project_tag).toEqual(["iot", "office"]);
		expect(others[1].fm.tags).toEqual(["supervised", "iot", "office"]);
	});

	it("removes project_tag when the field is emptied", async () => {
		const project = fakeFile("sv/personal/2026/10/a.md", {
			tags: ["supervised", "project"],
			project_tag: ["home"],
		});
		const { app, others } = fakeApp(project);
		submit(() => ({ projectTag: "" }));
		// biome-ignore lint/suspicious/noExplicitAny: fake app
		await setTitleAndProject(app as any);
		expect(project.fm).not.toHaveProperty("project_tag");
		expect(others[1].fm.tags).toEqual(["supervised"]);
	});
});

describe("markSupervisedViews", () => {
	it("marks only the views of supervised notes", async () => {
		const { markSupervisedViews } = await import("../src/commands");
		const toggled: [string, boolean][] = [];
		const view = (name: string, fm: Fm | null) => ({
			view: {
				file: fm && fakeFile(name, fm),
				containerEl: {
					toggleClass: (_c: string, on: boolean) => toggled.push([name, on]),
				},
			},
		});
		const app = {
			workspace: {
				getLeavesOfType: () => [
					view("task.md", { tags: ["supervised", "task"] }),
					view("memo.md", { tags: ["memo"] }),
					view("empty", null),
				],
			},
			metadataCache: {
				getFileCache: (f: { fm: Fm }) => ({ frontmatter: f.fm }),
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: a minimal fake of App
		markSupervisedViews(app as any);
		expect(toggled).toEqual([
			["task.md", true],
			["memo.md", false],
			["empty", false],
		]);
	});
});
