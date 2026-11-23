import {
	type App,
	Modal,
	Notice,
	normalizePath,
	PluginSettingTab,
	Setting,
} from "obsidian";
import {
	defaultDashboard,
	type RootEntry,
	rootEntries,
	supervisorNote,
} from "./dashboard";
import { managedRoots } from "./project";

/**
 * Creates the root folder and, when it is missing, the dashboard note of one root. Nothing is saved: the values
 * come from `## Locations` of the supervisor's CLAUDE.md each time.
 */
export async function setupRoot(
	app: App,
	opts: { root: string; templates: string; dashboard: string },
): Promise<"created" | "exists"> {
	const root = opts.root ? normalizePath(opts.root) : "";
	const dashboard = normalizePath(opts.dashboard);
	if (root && !app.vault.getFolderByPath(root))
		await app.vault.createFolder(root);
	if (app.vault.getAbstractFileByPath(dashboard)) return "exists";
	const parent = dashboard.includes("/")
		? dashboard.replace(/\/[^/]+$/, "")
		: "";
	if (parent && !app.vault.getFolderByPath(parent))
		await app.vault.createFolder(parent);
	await app.vault.create(
		dashboard,
		supervisorNote({
			root: root || undefined,
			templates: opts.templates.trim() || undefined,
		}),
	);
	return "created";
}

class SetupModal extends Modal {
	private root = "";
	private templates = "_templates";
	private dashboard = defaultDashboard("");
	private dashboardEdited = false;

	onOpen(): void {
		this.setTitle("Set up a supervisor root");
		const { contentEl } = this;
		contentEl.createEl("p", {
			text: "Enter the values of ## Locations in the supervisor's CLAUDE.md. Run this once per root.",
		});
		let dashboardInput: { setValue(v: string): unknown } | undefined;
		new Setting(contentEl)
			.setName("Root")
			.setDesc("Folder of the notes (root). Empty for the vault root.")
			.addText((t) =>
				t.setPlaceholder("supervisor/work").onChange((v) => {
					this.root = v;
					if (!this.dashboardEdited) {
						this.dashboard = defaultDashboard(v);
						dashboardInput?.setValue(this.dashboard);
					}
				}),
			);
		new Setting(contentEl)
			.setName("Templates")
			.setDesc(
				"Template folder (templates). Its notes are left off the dashboard.",
			)
			.addText((t) =>
				t.setValue(this.templates).onChange((v) => {
					this.templates = v;
				}),
			);
		new Setting(contentEl)
			.setName("Dashboard")
			.setDesc("Dashboard note (dashboard).")
			.addText((t) => {
				dashboardInput = t;
				t.setValue(this.dashboard).onChange((v) => {
					this.dashboard = v;
					this.dashboardEdited = true;
				});
			});
		new Setting(contentEl).addButton((b) =>
			b
				.setButtonText("Set up")
				.setCta()
				.onClick(async () => {
					if (!this.dashboard.trim()) {
						new Notice("Enter the dashboard note.");
						return;
					}
					try {
						const result = await setupRoot(this.app, {
							root: this.root.trim(),
							templates: this.templates,
							dashboard: this.dashboard.trim(),
						});
						new Notice(`${result}: ${normalizePath(this.dashboard.trim())}`);
						this.close();
					} catch (e) {
						new Notice(`Setup failed: ${e}`);
					}
				}),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** The roots of the vault: the dashboard notes it holds and the roots of its managed notes. */
async function findRoots(app: App): Promise<RootEntry[]> {
	const dashboards: { path: string; text: string }[] = [];
	const notes: { folder: string; managed: boolean }[] = [];
	for (const f of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(f);
		const fm = cache?.frontmatter ?? {};
		notes.push({
			folder: f.parent?.path ?? "",
			managed:
				([] as unknown[]).concat(fm.tags ?? []).includes("supervised") &&
				Boolean(fm.task_id || fm.project_id),
		});
		if (cache?.sections?.some((s) => s.type === "code"))
			dashboards.push({ path: f.path, text: await app.vault.cachedRead(f) });
	}
	return rootEntries(dashboards, managedRoots(notes));
}

export class SetupSettingTab extends PluginSettingTab {
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Setup")
			.setDesc(
				"Create a root folder and its dashboard note when it is missing. An existing dashboard is left untouched.",
			)
			.addButton((b) =>
				b
					.setButtonText("Set up")
					.onClick(() => new SetupModal(this.app).open()),
			);
		new Setting(containerEl).setName("Roots").setHeading();
		const list = containerEl.createDiv();
		void this.showRoots(list);
	}

	private async showRoots(el: HTMLElement): Promise<void> {
		const roots = await findRoots(this.app);
		if (!roots.length) {
			el.createEl("p", { text: "No roots found in this vault." });
			return;
		}
		const run = async (entries: RootEntry[]) => {
			for (const e of entries) {
				try {
					const result = await setupRoot(this.app, e);
					new Notice(`${result}: ${e.dashboard}`);
				} catch (err) {
					new Notice(`Setup failed for ${e.dashboard}: ${err}`);
				}
			}
			this.display();
		};
		new Setting(el)
			.setName("Re-run setup for all roots")
			.setDesc("Run setup again with the values below.")
			.addButton((b) =>
				b.setButtonText("Re-run all").onClick(() => run(roots)),
			);
		for (const e of roots) {
			const desc = createFragment((f) => {
				f.appendText(`Templates: ${e.templates || "(none)"}`);
				f.createEl("br");
				f.appendText(
					`Dashboard: ${e.dashboard}${e.exists ? "" : " (missing)"}`,
				);
			});
			new Setting(el)
				.setName(`Root: ${e.root || "(vault)"}`)
				.setDesc(desc)
				.addButton((b) => b.setButtonText("Re-run").onClick(() => run([e])));
		}
	}
}
