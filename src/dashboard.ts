// Port of state_tool.py's supervisor_note (current layout only). Both are checked against
// skill/tests/fixtures/dashboard-*.md, so change them together.

const PRIORITY_FORMULA = `\n  priority_rank: 'if(priority == "A", 1, if(priority == "C", 3, 2))'`;
const TASK_SORT =
	"\n    sort:\n      - property: formula.priority_rank\n        direction: ASC" +
	"\n      - property: file.mtime\n        direction: DESC";
const TASK_ORDER =
	"[formula.title, summary, priority, subtasks, task_id, parent]";
const PROJECT_ORDER = "[formula.title, summary, project_id, assignee]";
const NOT_PROJECT = `'!file.hasTag("project")'`;
const assigneeIs = (who: string) => `'assignee == "${who}"'`;

function kanbanBase(
	name: string,
	filters: string[],
	templates: string | undefined,
	order: string,
	sort: string,
	formulas: string,
	root: string | undefined,
): string {
	const all = [
		...(root ? [`file.inFolder("${root}")`] : []),
		...(templates ? [`'!file.inFolder("${templates}")'`] : []),
		...filters,
	];
	const lines = all.map((f) => `\n    - ${f}`).join("");
	return `\`\`\`base
filters:
  and:
    - file.hasTag("supervised")${lines}
formulas:
  title: link(file.name, title)${formulas}
views:
  - type: kanban
    name: ${name}
    groupBy:
      property: status
      direction: ASC
    order: ${order}${sort}
    groupOrder: [backlog, in progress, pending, done, archived]
    hideEmptyGroups: false
\`\`\`
`;
}

export function supervisorNote(opts: {
	root?: string;
	templates?: string;
}): string {
	const { root, templates } = opts;
	const task = (name: string, who: string) =>
		kanbanBase(
			name,
			[NOT_PROJECT, assigneeIs(who)],
			templates,
			TASK_ORDER,
			TASK_SORT,
			PRIORITY_FORMULA,
			root,
		);
	const project = kanbanBase(
		"プロジェクト",
		['file.hasTag("project")'],
		templates,
		PROJECT_ORDER,
		"",
		"",
		root,
	);
	return `## ユーザーの番\n\n${task("ユーザー", "user")}\n## エージェントの番\n\n${task("エージェント", "agent")}\n## プロジェクト\n\n${project}`;
}

/** The dashboard note setup offers for root: <root>/Supervisor.md. */
export const defaultDashboard = (root: string) =>
	root.trim()
		? `${root.trim().replace(/\/+$/, "")}/Supervisor.md`
		: "Supervisor.md";

/** The root and templates a dashboard note was made for (by supervisorNote or an earlier layout); null for other notes. */
export function dashboardLocations(
	text: string,
): { root: string; templates: string } | null {
	if (!/^## ユーザーの番$/m.test(text) || !text.includes("```base"))
		return null;
	return {
		root: /^ {4}- file\.inFolder\("([^"]*)"\)$/m.exec(text)?.[1] ?? "",
		templates: /^ {4}- '!file\.inFolder\("([^"]*)"\)'$/m.exec(text)?.[1] ?? "",
	};
}

export type RootEntry = {
	root: string;
	templates: string;
	dashboard: string;
	/** False for a root that holds managed notes but has no dashboard note. */
	exists: boolean;
};

/**
 * The roots of the vault with the values setup uses: one per dashboard note, plus each root of managed notes
 * that no dashboard covers (with the values setup offers by default). Sorted by root, then dashboard.
 */
export function rootEntries(
	dashboards: { path: string; text: string }[],
	managed: string[],
): RootEntry[] {
	const found: RootEntry[] = dashboards.flatMap(({ path, text }) => {
		const loc = dashboardLocations(text);
		return loc ? [{ ...loc, dashboard: path, exists: true }] : [];
	});
	const missing = managed
		.filter((root) => !found.some((e) => e.root === root))
		.map((root) => ({
			root,
			templates: "_templates",
			dashboard: defaultDashboard(root),
			exists: false,
		}));
	return [...found, ...missing].sort(
		(a, b) =>
			a.root.localeCompare(b.root) || a.dashboard.localeCompare(b.dashboard),
	);
}
