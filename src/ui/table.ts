import { groupLabel, type ErrorGroup } from "../grouping";
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

export function renderJobTable(container: Element, group: ErrorGroup | null, selectedJobId: string | null): void {
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
          <tr><th>Job</th><th>Queue</th><th class="num">Attempts</th><th>Failed (UTC)</th><th>Payload</th></tr>
        </thead>
        <tbody>${group.jobs.map((job) => renderRow(job, job.id === selectedJobId)).join("")}</tbody>
      </table>
    </div>`;
}
