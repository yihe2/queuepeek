import { checkPayload, isEdited, payloadText, type Edits } from "../edits";
import type { Job } from "../types";
import { escapeHtml } from "./escape";
import { queueName, shortTime } from "./format";

const MIN_ROWS = 6;
const MAX_ROWS = 30;

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

export function renderPayload(container: Element, job: Job | null, edits: Edits): void {
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
  const text = payloadText(edits, job.id, prettyPayload(job));
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, text.split("\n").length + 1));

  container.innerHTML = `
    <dl class="job-fields">
      ${fields.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join("")}
    </dl>
    <div class="editor-head">
      <span class="editor-state" data-editor-state></span>
      <button type="button" class="revert" data-revert-payload hidden>Revert</button>
    </div>
    <textarea class="payload" data-payload-editor rows="${rows}" spellcheck="false" aria-label="Payload">${escapeHtml(text)}</textarea>
    <p class="payload-error" data-payload-error role="alert" hidden></p>`;

  showPayloadCheck(container, job, edits);
}

/** Updates the edited marker and validation message without replacing the textarea, so focus and caret survive. */
export function showPayloadCheck(container: Element, job: Job, edits: Edits): void {
  const check = checkPayload(job, payloadText(edits, job.id, prettyPayload(job)));
  const edited = isEdited(edits, job.id);
  const error = container.querySelector("[data-payload-error]");

  container.querySelector("[data-payload-editor]")?.classList.toggle("is-invalid", !check.ok);
  if (error) {
    error.textContent = check.ok ? "" : check.message;
    error.toggleAttribute("hidden", check.ok);
  }
  const state = container.querySelector("[data-editor-state]");
  if (state) {
    state.textContent = edited ? "Edited" : "Original";
    state.classList.toggle("is-edited", edited);
  }
  container.querySelector("[data-revert-payload]")?.toggleAttribute("hidden", !edited);
}
