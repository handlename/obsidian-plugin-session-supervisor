// Generates src/skill-files.gen.json ({files: {path: text}, hash}) from skill/, which esbuild bundles into main.js.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SKILL = "skill";
const INCLUDE = [
	"SKILL.md",
	"references",
	"scripts/state_tool.py",
	"assets/chat-CLAUDE.md",
	"assets/sv.sh",
];

function walk(path) {
	if (statSync(path).isDirectory()) {
		return readdirSync(path)
			.filter((name) => name !== "__pycache__" && !name.startsWith("."))
			.flatMap((name) => walk(join(path, name)));
	}
	return [path];
}

const paths = INCLUDE.flatMap((p) => walk(join(SKILL, p)))
	.map((p) => relative(SKILL, p).split("\\").join("/"))
	.sort();
const files = Object.fromEntries(
	paths.map((p) => [p, readFileSync(join(SKILL, p), "utf8")]),
);
const hash = createHash("sha256");
for (const p of paths) hash.update(`${p}\0${files[p]}\0`);

writeFileSync(
	"src/skill-files.gen.json",
	`${JSON.stringify({ files, hash: hash.digest("hex").slice(0, 12) })}\n`,
);
