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
import { pick, prompt } from "./ui";

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
 * Asks the title of a task note, picks its project (or none) in the same root, writes `title` and `parent`, and
 * renames the note to its uid. A note outside every root (for example one a template plugin created at the vault's
 * top) first gets a root to move into, as <root>/YYYY/MM. Cancelling the title keeps the title; cancelling a picker
 * changes nothing.
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
	const typed = await prompt(
		app,
		"タイトル",
		defaultTitle(own.title, file.basename),
	);
	const newTitle = typed?.trim();
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
	let folder = file.parent?.path ?? "";
	let root = folderRoot(folder);
	if (roots.length && !roots.includes(root)) {
		const picked = await pick(app, roots, (r) => r || "(vault)");
		if (picked === null) return;
		root = picked;
		folder = datedFolder(root, new Date());
	}
	const moving = folder !== (file.parent?.path ?? "");
	const projects = notes
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
	const choice = await pick(
		app,
		[{ f: null, fm: {} as Frontmatter }, ...projects],
		({ f, fm }) =>
			f ? `${fm.project_id} ${fm.title || f.basename}` : "(プロジェクトなし)",
	);
	if (!choice) return;
	await app.fileManager.processFrontMatter(file, (front: Frontmatter) => {
		if (choice.f) {
			front.parent = parentLink(
				choice.f.path,
				String(choice.fm.title || choice.f.basename),
			);
		} else {
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
