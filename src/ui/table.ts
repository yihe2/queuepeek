import { inclusion, isEdited, isIncluded, type Edits } from "../edits";
import { groupLabel, type ErrorGroup } from "../grouping";
import { sortJobs, type JobSort, type SortKey } from "../sorting";
import type { Job } from "../types";
import { escapeHtml } from "./escape";
import { payloadPreview, plural, queueName, shortTime } from "./format";

const EDITED_TAG = `<span class="tag" data-edited-tag title="Payload edited">edited</span>`;

const POISON_TAG = `<span class="tag tag-poison" title="Poison: retrying will not help">poison</span>`;

export type PoisonCheck = (jobId: string) => boolean;

function renderRow(job: Job, selected: boolean, edits: Edits, poisoned: PoisonCheck): string {
  const edited = isEdited(edits, job.id);
  const poison = poisoned(job.id);
  const classes = [selected ? "is-selected" : "", edited ? "is-edited" : "", poison ? "is-poison" : ""]
    .filter(Boolean)
    .join(" ");

  const id = escapeHtml(job.id);
  const checked = isIncluded(edits, job.id) ? " checked" : "";

  return `
    <tr class="${classes}" data-job-id="${id}">
      <td class="pick"><input type="checkbox" data-include-job="${id}" aria-label="Include ${id} in retry batch"${checked} /></td>
      <td class="job-id">${escapeHtml(job.id)} ${poison ? POISON_TAG : ""}${edited ? EDITED_TAG : ""}</td>
      <td>${escapeHtml(queueName(job.queue))}</td>
      <td class="num">${job.attempts}</td>
      <td class="time">${escapeHtml(shortTime(job.failedAt))}</td>
      <td class="preview"><code>${escapeHtml(payloadPreview(job))}</code></td>
    </tr>`;
}

function findRow(container: Element, jobId: string): HTMLElement | undefined {
  return [...container.querySelectorAll<HTMLElement>("tr[data-job-id]")].find((row) => row.dataset.jobId === jobId);
}

/**
 * Updates one row's edited tag in place. Redrawing the table on editor blur would replace
 * the row under the pointer and swallow the click that caused the blur.
 */
export function markEdited(container: Element, jobId: string, edited: boolean): void {
  const row = findRow(container, jobId);
  if (!row) {
    return;
  }
  row.classList.toggle("is-edited", edited);
  const cell = row.querySelector(".job-id");
  const tag = cell?.querySelector("[data-edited-tag]");
  if (edited && !tag) {
    cell?.insertAdjacentHTML("beforeend", EDITED_TAG);
  } else if (!edited) {
    tag?.remove();
  }
}

function sortHeader(label: string, key: SortKey, sort: JobSort, className = ""): string {
  const active = sort.key === key;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const arrow = active ? (sort.direction === "asc" ? " ▲" : " ▼") : "";

  return `
    <th class="${className}" aria-sort="${ariaSort}">
      <button type="button" class="sort${active ? " is-active" : ""}" data-sort="${key}">${label}${arrow}</button>
    </th>`;
}

export function renderJobTable(
  container: Element,
  group: ErrorGroup | null,
  selectedJobId: string | null,
  sort: JobSort,
  edits: Edits,
  poisoned: PoisonCheck,
): void {
  if (!group) {
    container.innerHTML = "";
    return;
  }

  const message = group.message === "" ? "" : `<p class="jobs-message">${escapeHtml(group.message)}</p>`;
  const allIncluded = inclusion(group.jobs, edits) === "all";
  const bulkLabel = allIncluded ? "Exclude all" : `Include all ${group.count}`;

  container.innerHTML = `
    <header class="jobs-head">
      <h2>${escapeHtml(groupLabel(group))}</h2>
      <span>${plural(group.count, "job")} · max ${group.maxAttempts} attempts</span>
      <button type="button" class="bulk-include" data-include-group="${allIncluded ? "off" : "on"}">${bulkLabel}</button>
    </header>
    ${message}
    <div class="table-wrap">
      <table class="jobs">
        <thead>
          <tr>
            <th class="pick" title="Include in retry batch">Retry</th>
            <th>Job</th>
            ${sortHeader("Queue", "queue", sort)}
            ${sortHeader("Attempts", "attempts", sort, "num")}
            ${sortHeader("Failed (UTC)", "failedAt", sort)}
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>${sortJobs(group.jobs, sort)
          .map((job) => renderRow(job, job.id === selectedJobId, edits, poisoned))
          .join("")}</tbody>
      </table>
    </div>`;
}
