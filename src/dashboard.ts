// Port of state_tool.py's supervisor_note (current layout only). Both are checked against
// skill/tests/fixtures/dashboard-*.md, so change them together.

const PRIORITY_FORMULA = `\n  priority_rank: 'if(priority == "A", 1, if(priority == "C", 3, 2))'`;
const TASK_SORT =
	"\n    sort:\n      - property: formula.priority_rank\n        direction: ASC" +
	"\n      - property: file.mtime\n        direction: DESC";
const TASK_ORDER =
	"[formula.title, summary, priority, subtasks, task_id, project_id, created_at]";
const PROJECT_ORDER =
	"[formula.title, summary, project_id, assignee, created_at]";
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
