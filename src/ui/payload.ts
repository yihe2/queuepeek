import type { Job } from "../types";
import { escapeHtml } from "./escape";
import { queueName, shortTime } from "./format";

/** Indented JSON when the payload is structured; the original text otherwise. */
export function prettyPayload(job: Job): string {
  if (job.payload === undefined || job.payload === null || typeof job.payload === "string") {
    return job.payloadText;
  }
  try {
    return JSON.stringify(job.payload, null, 2) ?? job.payloadText;
  } catch {
    return job.payloadText;
  }
}

function errorLine(job: Job): string {
  if (job.errorClass === "") {
    return job.errorMessage === "" ? "—" : job.errorMessage;
  }
  return job.errorMessage === "" ? job.errorClass : `${job.errorClass}: ${job.errorMessage}`;
}

export function renderPayload(container: Element, job: Job | null): void {
  if (!job) {
    container.innerHTML = `<p class="empty">Select a job to see its payload.</p>`;
    return;
  }

  const fields: [string, string][] = [
    ["Id", job.id],
    ["Queue", queueName(job.queue)],
    ["Attempts", String(job.attempts)],
    ["Failed", shortTime(job.failedAt)],
    ["Error", errorLine(job)],
  ];

  container.innerHTML = `
    <dl class="job-fields">
      ${fields.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join("")}
    </dl>
    <pre class="payload"><code>${escapeHtml(prettyPayload(job))}</code></pre>`;
}
