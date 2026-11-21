import MOVES from "./moves.json";

export type Kind = "task" | "project";
export type Guard = "held_only" | "unheld" | "done_proposed" | "not_proposed";

export interface Move {
	kind: Kind;
	label: string;
	from: string[];
	managed?: boolean;
	when?: Guard;
	to: string;
}

export type Guards = Record<Guard, boolean>;

/** The note text below its frontmatter, as lines (the whole text when it has none). */
export function noteBody(text: string): string[] {
	const lines = text.split("\n");
	const close = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
	return lines.slice(close + 1);
}

/**
 * The `when` guards of the moves, from the note body (state_tool.py's note format).
 * state_tool never writes done/agent: a finished task shows in progress/user with only its completion ask
 * (auto=task_done) open, and a project the manager proposes as done shows in progress/user with its completion ask.
 */
export function guards(body: string[], managed: boolean): Guards {
	// The metadata line is right below the heading, or after one blank line (0.65.3 and later).
	const meta = (i: number) =>
		(body[i + 1] ?? "").trim() ? (body[i + 1] ?? "") : (body[i + 2] ?? "");
	const open = body.flatMap((line, i) =>
		/^### \[UA-\d+\] @user /.test(line) ? [meta(i)] : [],
	);
	// A numbered subtask left unchecked keeps the task open as well: done/user would cancel it.
	const subtasks = body.some((line) => /^- \[ \] \[ST-\d+\] /.test(line));
	const waiting =
		!subtasks && open.every((m) => /^<!-- sv auto=task_done /.test(m));
	const doneProposed =
		managed &&
		body.some(
			(line) =>
				line.startsWith("### [UA-") &&
				(line.includes("@user プロジェクトの完了を確認してください") ||
					line.includes("@user Confirm that the project is done")),
		);
	return {
		held_only: managed && waiting,
		unheld: managed && !waiting,
		done_proposed: doneProposed,
		// A project the manager has not proposed as done can still be closed by the user (notes-scan row 14).
		not_proposed: managed && !doneProposed,
	};
}

export interface NoteState {
	kind: Kind;
	managed: boolean;
	status: string;
	assignee: string;
	body: string[];
}

export function availableMoves(note: NoteState): Move[] {
	const now = `${note.status}/${note.assignee}`;
	const when = guards(note.body, note.managed);
	return (MOVES as Move[]).filter(
		(m) =>
			m.kind === note.kind &&
			m.from.includes(now) &&
			(m.managed === undefined || m.managed === note.managed) &&
			(m.when === undefined || when[m.when]),
	);
}
