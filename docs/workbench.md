# Workbench Layout

The workbench is one page with three panes under the top bar and a status line at the bottom.

| Pane | Element | Shows |
| --- | --- | --- |
| Groups | `#groups` | error groups, largest first, with count, masked message, and busiest queues |
| Stage | `#dropzone`, `#jobs` | drop zone, load errors, parse issues, and the selected group's job table |
| Payload | `#payload` | the selected job's fields and its payload |

Each pane scrolls on its own, so a long job table does not push the payload out of view.

## Flow

1. Drop a dump on the stage, or click it to pick a file.
2. The dump is parsed, its producer detected, and its jobs grouped (see [grouping.md](grouping.md)).
3. The largest group is selected, and within it the group's sample job.
4. Clicking a group shows its jobs. Clicking a row shows that job's payload.

After a successful load the drop zone shrinks to a single line. It still accepts a new file.

## Selection

Selection lives in `src/state.ts` as a plain object: the groups, the selected group id, and the selected job id. Every change goes through a function that returns a new state, and `render()` redraws the three panes from it.

Reloading a dump keeps the selected group if a group with the same id exists in the new dump. Group ids depend only on error class and masked message, so this holds across reorderings and re-exports. Otherwise the largest group is selected.

## Job Table

| Column | Source |
| --- | --- |
| Job | `job.id` |
| Queue | `job.queue`, or `(no queue)` |
| Attempts | `job.attempts` |
| Failed (UTC) | `job.failedAt` to the minute; unreadable values are shown as-is, missing ones as `—` |
| Payload | the payload text on one line, cut at 80 characters |

Rows are in dump order. Sorting and filtering are not in yet.

## Payload Pane

Structured payloads are indented JSON. Payloads that were plain strings, or that could not be parsed, are shown as the original text.

## Load Errors

If a dump cannot be read (bad JSON, an unknown wrapper, or mixed producers), the error replaces the job table, the groups are cleared, and the drop zone returns to full size. Messages are listed in [load-errors.md](load-errors.md). Individual bad records do not count as load errors; they are skipped and listed under the drop zone.

## Escaping

Everything that comes from a dump is escaped before it reaches `innerHTML` (`src/ui/escape.ts`). Dumps are untrusted input: payloads and error messages regularly contain HTML, and a dead-letter queue is where a malicious payload would end up.
