import { Plugin } from "obsidian";
import {
	changeStatus,
	markSupervisedViews,
	setTitleAndProject,
} from "./commands";
import { SetupSettingTab } from "./setup";
import { extractSkill } from "./skill";

export default class SessionSupervisorPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "change-status",
			name: "状態を変える",
			callback: () => changeStatus(this.app),
		});
		this.addCommand({
			id: "set-title-and-project",
			name: "タイトルとプロジェクトを設定",
			callback: () => setTitleAndProject(this.app),
		});
		this.addSettingTab(new SetupSettingTab(this.app, this));
		const mark = () => markSupervisedViews(this.app);
		this.registerEvent(this.app.workspace.on("layout-change", mark));
		this.registerEvent(this.app.workspace.on("file-open", mark));
		this.registerEvent(this.app.metadataCache.on("changed", mark));
		this.app.workspace.onLayoutReady(() => {
			mark();
			extractSkill(this);
		});
	}
}
