import { Plugin } from "obsidian";
import { changeStatus, setTitleAndProject } from "./commands";
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
		this.app.workspace.onLayoutReady(() => extractSkill(this));
	}
}
