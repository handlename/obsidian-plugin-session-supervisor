import {
	type App,
	Modal,
	Notice,
	normalizePath,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { supervisorNote } from "./dashboard";

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

const defaultDashboard = (root: string) =>
	root.trim()
		? `${root.trim().replace(/\/+$/, "")}/Supervisor.md`
		: "Supervisor.md";

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

export class SetupSettingTab extends PluginSettingTab {
	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Setup")
			.setDesc(
				"Create a root folder and its dashboard note when it is missing. An existing dashboard is left untouched.",
			)
			.addButton((b) =>
				b
					.setButtonText("Set up")
					.onClick(() => new SetupModal(this.app).open()),
			);
	}
}
