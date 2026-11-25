import { type App, Modal, Setting, SuggestModal } from "obsidian";

class PickModal<T> extends SuggestModal<T> {
	private chosen = false;

	constructor(
		app: App,
		private items: T[],
		private label: (item: T) => string,
		private resolve: (item: T | null) => void,
	) {
		super(app);
	}

	getSuggestions(query: string): T[] {
		const q = query.toLowerCase();
		return this.items.filter((i) => this.label(i).toLowerCase().includes(q));
	}

	renderSuggestion(item: T, el: HTMLElement): void {
		el.setText(this.label(item));
	}

	onChooseSuggestion(item: T): void {
		this.chosen = true;
		this.resolve(item);
	}

	onClose(): void {
		// Obsidian calls onClose before onChooseSuggestion.
		window.setTimeout(() => {
			if (!this.chosen) this.resolve(null);
		}, 0);
	}
}

/** Lets the user pick one of items; null when the picker is dismissed. */
export function pick<T>(
	app: App,
	items: T[],
	label: (item: T) => string,
): Promise<T | null> {
	return new Promise((resolve) =>
		new PickModal(app, items, label, resolve).open(),
	);
}

export interface NoteForm<P> {
	/** The roots to choose from; no root dropdown when empty. */
	roots: string[];
	root: string;
	/** The projects of a root; no project dropdown when undefined (a project note). */
	projectsOf?: (root: string) => P[];
	projectLabel: (project: P) => string;
	project: P | null;
	title: string;
	/** The project tags, space separated; no field when undefined (a task note). */
	projectTag?: string;
}

class NoteModal<P> extends Modal {
	private done = false;

	constructor(
		app: App,
		private form: NoteForm<P>,
		private resolve: (form: NoteForm<P> | null) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const form = this.form;
		const contentEl = this.contentEl;
		let { root, project, title, projectTag } = form;
		const submit = () => {
			this.done = true;
			this.resolve({ ...form, root, project, title, projectTag });
			this.close();
		};
		const submitOnEnter = (e: KeyboardEvent) => {
			if (e.key !== "Enter" || e.isComposing) return;
			// Without this the Enter also lands in the editor that gets the focus back, as a line before the frontmatter.
			e.preventDefault();
			submit();
		};
		this.setTitle("タイトルとプロジェクト");
		let fillProjects = () => {};
		if (form.roots.length)
			new Setting(contentEl).setName("Root").addDropdown((d) => {
				for (const r of form.roots) d.addOption(r, r || "(vault)");
				d.setValue(root).onChange((v) => {
					root = v;
					fillProjects();
				});
			});
		const { projectsOf } = form;
		if (projectsOf)
			new Setting(contentEl).setName("プロジェクト").addDropdown((d) => {
				let list: P[] = [];
				fillProjects = () => {
					list = projectsOf(root);
					if (project && !list.includes(project)) project = null;
					d.selectEl.empty();
					d.addOption("", "(プロジェクトなし)");
					list.forEach((p, i) => {
						d.addOption(String(i), form.projectLabel(p));
					});
					d.setValue(project ? String(list.indexOf(project)) : "");
				};
				fillProjects();
				d.onChange((v) => {
					project = (v && list[Number(v)]) || null;
				});
			});
		new Setting(contentEl)
			.setName("タイトル")
			.setClass("sv-note-title")
			.addText((text) => {
				text.setValue(title).onChange((v) => {
					title = v;
				});
				text.inputEl.addEventListener("keydown", submitOnEnter);
				window.setTimeout(() => text.inputEl.select(), 0);
			});
		if (projectTag !== undefined)
			new Setting(contentEl)
				.setName("プロジェクトタグ")
				.setDesc("任意。空白区切りで、紐づくタスクにも付きます")
				.setClass("sv-note-title")
				.addText((text) => {
					text.setValue(projectTag ?? "").onChange((v) => {
						projectTag = v;
					});
					text.inputEl.addEventListener("keydown", submitOnEnter);
				});
		new Setting(contentEl).addButton((b) =>
			b.setButtonText("OK").setCta().onClick(submit),
		);
	}

	onClose(): void {
		if (!this.done) this.resolve(null);
		this.contentEl.empty();
	}
}

/** Asks the root, the project, and the title of a note in one dialog; null when the dialog is dismissed. */
export function noteDialog<P>(
	app: App,
	form: NoteForm<P>,
): Promise<NoteForm<P> | null> {
	return new Promise((resolve) => new NoteModal(app, form, resolve).open());
}

/** Closes Obsidian's rename dialogs (Templater opens one for each note it creates). */
export function closeRenamePrompts(): void {
	activeDocument
		.querySelectorAll<HTMLElement>(
			".modal.mod-file-rename > .modal-header-button, .modal.mod-file-rename > .modal-close-button",
		)
		.forEach((button) => {
			button.click();
		});
}
