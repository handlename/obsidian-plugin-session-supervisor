import {
	type App,
	getFrontMatterInfo,
	MarkdownView,
	Notice,
	parseYaml,
	type TFile,
} from "obsidian";
import { availableMoves, noteBody } from "./moves";
import { defaultTitle, folderRoot, parentLink, uidPath } from "./project";
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
 * renames the note to its uid. Cancelling the title keeps the title; cancelling the picker changes nothing.
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
	const root = folderRoot(file.parent?.path ?? "");
	const projects = app.vault
		.getMarkdownFiles()
		.map((f) => ({ f, fm: fmOf(app, f) }))
		.filter(
			({ f, fm }) =>
				f.path !== file.path &&
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
	const dest = uidPath(file.parent?.path ?? "", file.basename, uid);
	if (!dest) return;
	if (app.vault.getAbstractFileByPath(dest)) {
		new Notice(`${dest} が既にあるので名前を変えません`);
		return;
	}
	await app.fileManager.renameFile(file, dest);
}
