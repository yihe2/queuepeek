import { isEdited, type Edits } from "../edits";
import { groupLabel, type ErrorGroup } from "../grouping";
import { sortJobs, type JobSort, type SortKey } from "../sorting";
import type { Job } from "../types";
import { escapeHtml } from "./escape";
import { payloadPreview, plural, queueName, shortTime } from "./format";

const EDITED_TAG = `<span class="tag" data-edited-tag title="Payload edited">edited</span>`;

function renderRow(job: Job, selected: boolean, edits: Edits): string {
  const edited = isEdited(edits, job.id);
  const classes = [selected ? "is-selected" : "", edited ? "is-edited" : ""].filter(Boolean).join(" ");

  return `
    <tr class="${classes}" data-job-id="${escapeHtml(job.id)}">
      <td class="job-id">${escapeHtml(job.id)} ${edited ? EDITED_TAG : ""}</td>
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
): void {
  if (!group) {
    container.innerHTML = "";
    return;
  }

  const message = group.message === "" ? "" : `<p class="jobs-message">${escapeHtml(group.message)}</p>`;

  container.innerHTML = `
    <header class="jobs-head">
      <h2>${escapeHtml(groupLabel(group))}</h2>
      <span>${plural(group.count, "job")} · max ${group.maxAttempts} attempts</span>
    </header>
    ${message}
    <div class="table-wrap">
      <table class="jobs">
        <thead>
          <tr>
            <th>Job</th>
            ${sortHeader("Queue", "queue", sort)}
            ${sortHeader("Attempts", "attempts", sort, "num")}
            ${sortHeader("Failed (UTC)", "failedAt", sort)}
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>${sortJobs(group.jobs, sort)
          .map((job) => renderRow(job, job.id === selectedJobId, edits))
          .join("")}</tbody>
      </table>
    </div>`;
}
