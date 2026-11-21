import { describe, expect, it } from "vitest";
import { markerOf, planExtract } from "../src/extract";

describe("planExtract", () => {
	const files = { "SKILL.md": "a", "references/x.md": "b" };
	const marker = markerOf("1.0.0", "abc");

	it("skips when the marker matches", () => {
		expect(planExtract(files, marker, "1.0.0+abc\n")).toBeNull();
	});

	it("writes every file when the marker differs or is missing", () => {
		expect(planExtract(files, marker, "1.0.0+old")).toEqual([
			["SKILL.md", "a"],
			["references/x.md", "b"],
		]);
		expect(planExtract(files, marker, null)).toHaveLength(2);
	});
});
