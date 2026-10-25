# Workbench Layout

The workbench is one page with three panes under the top bar and a status line at the bottom.

| Pane | Element | Shows |
| --- | --- | --- |
| Groups | `#groups` | error groups, largest first, with count, masked message, and busiest queues |
| Stage | `#dropzone`, `#filters`, `#jobs` | drop zone, load errors, parse issues, the filter bar, and the selected group's job table |
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

Reloading a dump or changing a filter keeps the selected group if a group with the same id still exists, and keeps the selected job if it is still in that group. Group ids depend only on error class and masked message, so this holds across reorderings, re-exports, and filters. Otherwise the largest group and its sample job are selected.

## Filters

The filter bar appears once a dump is loaded. Filters narrow the jobs **before** grouping, so group counts, samples, and order in the sidebar always describe what is visible.

| Filter | Matches |
| --- | --- |
| Queue | one queue, including `(no queue)` |
| Class | one error class (trimmed, as grouping reads it), including `(no error class)` |
| Min attempts | jobs with at least this many attempts |
| Search | case-insensitive text in the job id, error class, error message, or payload |

All active filters must match. The choices in the queue and class lists come from the whole dump, so picking one never removes the others. The count at the right shows how many jobs pass, and **Clear** resets everything. If nothing passes, the table is replaced by a message with a **Clear filters** button.

Filters live in memory only. They reset when a new dump is loaded and are not written to the URL, since queue and class names from a production dump should not end up in browser history.

## Job Table

| Column | Source |
| --- | --- |
| Job | `job.id` |
| Queue | `job.queue`, or `(no queue)` |
| Attempts | `job.attempts` |
| Failed (UTC) | `job.failedAt` to the minute; unreadable values are shown as-is, missing ones as `—` |
| Payload | the payload text on one line, cut at 80 characters |

Rows start in dump order. Clicking **Queue**, **Attempts**, or **Failed (UTC)** sorts ascending, a second click sorts descending, and a third goes back to dump order. Ties keep dump order. Jobs without a readable failure time always sort last. The sort stays in place when you switch groups.

## Payload Pane

Structured payloads are indented JSON. Payloads that were plain strings, or that could not be parsed, are shown as the original text.

## Load Errors

If a dump cannot be read (bad JSON, an unknown wrapper, or mixed producers), the error replaces the job table, the groups are cleared, and the drop zone returns to full size. Messages are listed in [load-errors.md](load-errors.md). Individual bad records do not count as load errors; they are skipped and listed under the drop zone.

## Escaping

Everything that comes from a dump is escaped before it reaches `innerHTML` (`src/ui/escape.ts`). Dumps are untrusted input: payloads and error messages regularly contain HTML, and a dead-letter queue is where a malicious payload would end up.
