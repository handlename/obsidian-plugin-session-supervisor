import {
	type App,
	getFrontMatterInfo,
	MarkdownView,
	Notice,
	parseYaml,
	type TFile,
} from "obsidian";
import { availableMoves, noteBody } from "./moves";
import {
	datedFolder,
	defaultTitle,
	folderRoot,
	managedRoots,
	parentLink,
	uidPath,
} from "./project";
import { closeRenamePrompts, noteDialog, pick } from "./ui";

type Frontmatter = Record<string, unknown>;

const tagsOf = (fm: Frontmatter) => ([] as unknown[]).concat(fm.tags ?? []);
const fmOf = (app: App, file: TFile): Frontmatter =>
	app.metadataCache.getFileCache(file)?.frontmatter ?? {};

/** The note text including unsaved edits: the open editor's buffer, else the file on disk. */
async function currentText(app: App, file: TFile): Promise<string> {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	return view?.file === file ? view.editor.getValue() : app.vault.read(file);
}

/** Changes status/assignee of the active supervised note to a value notes-scan classifies (state_tool.py user_transition). */
export async function changeStatus(app: App): Promise<void> {
	const file = app.workspace.getActiveFile();
	if (!file || !tagsOf(fmOf(app, file)).includes("supervised")) {
		new Notice("supervised タグのあるノートで実行してください");
		return;
	}
	const text = await currentText(app, file);
	const info = getFrontMatterInfo(text);
	const fm: Frontmatter = info.exists
		? (parseYaml(info.frontmatter) ?? {})
		: {};
	const str = (key: string) => (fm[key] == null ? "" : String(fm[key]));
	const now = `${str("status")}/${str("assignee")}`;
	const moves = info.exists
		? availableMoves({
				kind: tagsOf(fm).includes("project") ? "project" : "task",
				managed: Boolean(fm.task_id || fm.project_id),
				status: str("status"),
				assignee: str("assignee"),
				body: noteBody(text),
			})
		: [];
	if (!moves.length) {
		new Notice(`${now} から変えられる操作はありません`);
		return;
	}
	const move = await pick(app, moves, (m) => `${m.label}(${m.to})`);
	if (!move) return;
	const [status, assignee] = move.to.split("/");
	await app.fileManager.processFrontMatter(file, (front: Frontmatter) => {
		front.status = status;
		front.assignee = assignee;
	});
}

/**
 * Asks the root, the project (or none) of a task note in that root, and the title in one dialog, writes `title` and
 * `parent`, and renames the note to its uid. Choosing another root than the note's (preselected for a note outside
 * every root, for example one a template plugin created at the vault's top) moves it to <root>/YYYY/MM. A project note
 * (tagged `project`) gets no project. An empty title keeps the title; dismissing the dialog changes nothing.
 * Obsidian's own "Note title" rename dialog, which Templater opens for a note it creates, is closed first so that the
 * title is asked once.
 */
export async function setTitleAndProject(app: App): Promise<void> {
	const file = app.workspace.getActiveFile();
	if (!file) {
		new Notice("ノートを開いて実行してください");
		return;
	}
	const own = fmOf(app, file);
	if (own.task_id) {
		new Notice("取り込み済みのタスクのプロジェクトは変えられません");
		return;
	}
	closeRenamePrompts();
	const notes = app.vault
		.getMarkdownFiles()
		.filter((f) => f.path !== file.path)
		.map((f) => ({ f, fm: fmOf(app, f) }));
	const roots = managedRoots(
		notes.map(({ f, fm }) => ({
			folder: f.parent?.path ?? "",
			managed:
				tagsOf(fm).includes("supervised") &&
				Boolean(fm.task_id || fm.project_id),
		})),
	);
	const here = file.parent?.path ?? "";
	const ownRoot = folderRoot(here);
	const projectsOf = (root: string) =>
		notes
			.filter(
				({ f, fm }) =>
					folderRoot(f.parent?.path ?? "") === root &&
					tagsOf(fm).includes("supervised") &&
					tagsOf(fm).includes("project") &&
					fm.project_id &&
					!["done", "archived"].includes(String(fm.status)),
			)
			.sort((a, b) =>
				String(a.fm.project_id).localeCompare(String(b.fm.project_id)),
			);
	const isProject = tagsOf(own).includes("project");
	const form = await noteDialog(app, {
		roots,
		root: roots.includes(ownRoot) ? ownRoot : (roots[0] ?? ownRoot),
		projectsOf: isProject ? undefined : projectsOf,
		projectLabel: ({ f, fm }) => `${fm.project_id} ${fm.title || f.basename}`,
		project:
			projectsOf(ownRoot).find(({ f }) =>
				String(own.parent ?? "").startsWith(
					`[[${f.path.replace(/\.md$/, "")}|`,
				),
			) ?? null,
		title: defaultTitle(own.title, file.basename),
	});
	if (!form) return;
	const folder =
		form.root === ownRoot ? here : datedFolder(form.root, new Date());
	const moving = folder !== here;
	const choice = form.project;
	const newTitle = form.title.trim();
	await app.fileManager.processFrontMatter(file, (front: Frontmatter) => {
		if (choice) {
			front.parent = parentLink(
				choice.f.path,
				String(choice.fm.title || choice.f.basename),
			);
		} else if (!isProject) {
			delete front.parent;
		}
		if (newTitle) front.title = newTitle;
	});
	// Read the uid from the file: the metadata cache may not have caught up with a note just created.
	const after = getFrontMatterInfo(await app.vault.read(file));
	const uid = after.exists ? parseYaml(after.frontmatter)?.uid : undefined;
	const dest =
		uidPath(folder, file.basename, uid) ??
		(moving ? `${folder}/${file.name}` : null);
	if (!dest) return;
	if (app.vault.getAbstractFileByPath(dest)) {
		new Notice(`${dest} が既にあるので名前と場所を変えません`);
		return;
	}
	if (moving && !app.vault.getFolderByPath(folder))
		await app.vault.createFolder(folder);
	await app.fileManager.renameFile(file, dest);
}
