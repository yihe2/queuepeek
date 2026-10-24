import { groupLabel, type ErrorGroup } from "../grouping";
import { sortJobs, type JobSort, type SortKey } from "../sorting";
import type { Job } from "../types";
import { escapeHtml } from "./escape";
import { payloadPreview, plural, queueName, shortTime } from "./format";

function renderRow(job: Job, selected: boolean): string {
  return `
    <tr class="${selected ? "is-selected" : ""}" data-job-id="${escapeHtml(job.id)}">
      <td class="job-id">${escapeHtml(job.id)}</td>
      <td>${escapeHtml(queueName(job.queue))}</td>
      <td class="num">${job.attempts}</td>
      <td class="time">${escapeHtml(shortTime(job.failedAt))}</td>
      <td class="preview"><code>${escapeHtml(payloadPreview(job))}</code></td>
    </tr>`;
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
          .map((job) => renderRow(job, job.id === selectedJobId))
          .join("")}</tbody>
      </table>
    </div>`;
}
