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

class PromptModal extends Modal {
	private value: string;
	private done = false;

	constructor(
		app: App,
		private title: string,
		initial: string,
		private resolve: (value: string | null) => void,
	) {
		super(app);
		this.value = initial;
	}

	onOpen(): void {
		this.setTitle(this.title);
		const submit = () => {
			this.done = true;
			this.resolve(this.value);
			this.close();
		};
		new Setting(this.contentEl).addText((text) => {
			text.setValue(this.value).onChange((v) => {
				this.value = v;
			});
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter" && !e.isComposing) submit();
			});
			window.setTimeout(() => text.inputEl.select(), 0);
		});
		new Setting(this.contentEl).addButton((b) =>
			b.setButtonText("OK").setCta().onClick(submit),
		);
	}

	onClose(): void {
		if (!this.done) this.resolve(null);
		this.contentEl.empty();
	}
}

/** Asks for one line of text; null when the dialog is dismissed. */
export function prompt(
	app: App,
	title: string,
	initial: string,
): Promise<string | null> {
	return new Promise((resolve) =>
		new PromptModal(app, title, initial, resolve).open(),
	);
}
