import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { supervisorNote } from "../src/dashboard";

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
