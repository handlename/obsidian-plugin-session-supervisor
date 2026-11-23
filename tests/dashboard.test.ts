import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	dashboardLocations,
	rootEntries,
	supervisorNote,
} from "../src/dashboard";

const fixture = (name: string) =>
	readFileSync(`skill/tests/fixtures/dashboard-${name}.md`, "utf8");

describe("supervisorNote", () => {
	it.each([
		["default", { templates: "_templates" }],
		["root", { templates: "_templates", root: "supervisor/work" }],
		["notemplates", {}],
	])("matches dashboard-%s.md", (name, opts) => {
		expect(supervisorNote(opts)).toBe(fixture(name));
	});
});

describe("dashboardLocations", () => {
	it.each([
		["default", { root: "", templates: "_templates" }],
		["root", { root: "supervisor/work", templates: "_templates" }],
		["notemplates", { root: "", templates: "" }],
	])("reads dashboard-%s.md", (name, want) => {
		expect(dashboardLocations(fixture(name))).toEqual(want);
	});

	it("ignores other notes, including a project note's ### kanbans", () => {
		expect(dashboardLocations("# note\n")).toBeNull();
		expect(
			dashboardLocations(
				`## タスク\n\n### ユーザーの番\n\n${supervisorNote({}).split("## エージェントの番")[0].replace("## ユーザーの番\n\n", "")}`,
			),
		).toBeNull();
	});
});

describe("rootEntries", () => {
	it("lists dashboards and the managed roots without one, sorted", () => {
		const dashboards = [
			{
				path: "supervisor/work/Supervisor.md",
				text: supervisorNote({ root: "supervisor/work", templates: "_t" }),
			},
			{ path: "notes/a.md", text: "plain" },
		];
		expect(
			rootEntries(dashboards, ["supervisor/work", "supervisor/personal"]),
		).toEqual([
			{
				root: "supervisor/personal",
				templates: "_templates",
				dashboard: "supervisor/personal/Supervisor.md",
				exists: false,
			},
			{
				root: "supervisor/work",
				templates: "_t",
				dashboard: "supervisor/work/Supervisor.md",
				exists: true,
			},
		]);
	});
});
