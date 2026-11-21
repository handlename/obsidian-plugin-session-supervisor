import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { availableMoves, guards, noteBody } from "../src/moves";

const DIR = "skill/tests/fixtures/notes-gen";
const expected: Record<
	string,
	{ kind: "task" | "project"; managed: boolean; flags: Record<string, boolean> }
> = JSON.parse(readFileSync(`${DIR}/expected.json`, "utf8"));
const body = (name: string) =>
	noteBody(readFileSync(`${DIR}/${name}.md`, "utf8"));

describe("guards", () => {
	it.each(Object.entries(expected))("%s", (name, exp) => {
		const got = guards(body(name), exp.managed);
		for (const [flag, value] of Object.entries(exp.flags)) {
			expect([flag, got[flag as keyof typeof got]]).toEqual([flag, value]);
		}
	});

	it("are all false on an unmanaged note", () => {
		expect(Object.values(guards(body("task-done-only"), false))).toEqual([
			false,
			false,
			false,
			false,
		]);
	});
});

describe("availableMoves", () => {
	const labels = (
		name: string,
		status: string,
		assignee: string,
		managed = true,
	) =>
		availableMoves({
			kind: expected[name]?.kind ?? "task",
			managed,
			status,
			assignee,
			body: body(name),
		}).map((m) => `${m.label}(${m.to})`);

	it("offers the completion ask only when the task waits for it", () => {
		expect(labels("task-done-only", "in progress", "user")).toContain(
			"完了確認(done/user)",
		);
		expect(labels("task-ua-open", "in progress", "user")).toContain(
			"完了にする(残りの作業は取り消し)(done/user)",
		);
		expect(labels("task-ua-open", "in progress", "user")).not.toContain(
			"完了確認(done/user)",
		);
	});

	it("offers to reject a proposed project completion", () => {
		expect(labels("project-done-proposed-ja", "in progress", "user")).toEqual(
			expect.arrayContaining([
				"完了を差し戻す(in progress/agent)",
				"完了確認(done/user)",
			]),
		);
		expect(labels("project-open", "in progress", "user")).toContain(
			"完了(done/user)",
		);
	});

	it("follows managed on an unmanaged task", () => {
		expect(labels("task-ua-open", "in progress", "user", false)).toEqual([
			"agent に渡す(backlog/agent)",
			"保留(pending/user)",
			"取り消す(archived/user)",
		]);
	});
});
