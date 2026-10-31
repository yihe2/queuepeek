import type { Job } from "./types";

/** Operator changes to one job. The parsed job itself is never modified, so revert is always possible. */
export type JobEdit = {
  /** Edited payload text, or `null` while the payload is untouched. */
  text: string | null;
  included: boolean;
};

/** Keyed by job id. */
export type Edits = ReadonlyMap<string, JobEdit>;

export const noEdits: Edits = new Map();

const untouched: JobEdit = { text: null, included: false };

export type PayloadCheck = { ok: true } | { ok: false; message: string };

export function getEdit(edits: Edits, jobId: string): JobEdit {
  return edits.get(jobId) ?? untouched;
}

function update(edits: Edits, jobId: string, change: Partial<JobEdit>): Edits {
  const next = { ...getEdit(edits, jobId), ...change };
  const copy = new Map(edits);
  if (next.text === null && !next.included) {
    copy.delete(jobId);
  } else {
    copy.set(jobId, next);
  }
  return copy;
}

/** Payloads that arrived as JSON must stay JSON. Plain-text payloads accept any text. */
export function checkPayload(job: Job, text: string): PayloadCheck {
  if (typeof job.payload === "string" || job.payload === undefined) {
    return { ok: true };
  }
  if (text.trim() === "") {
    return { ok: false, message: "Payload is empty. Revert to restore the original." };
  }
  try {
    JSON.parse(text);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof SyntaxError ? error.message : "Not valid JSON." };
  }
}

/** Text identical to the original counts as no edit, so retyping a payload back to what it was clears the marker. */
export function editPayload(edits: Edits, jobId: string, text: string, original: string): Edits {
  return update(edits, jobId, { text: text === original ? null : text });
}

export function revertPayload(edits: Edits, jobId: string): Edits {
  return update(edits, jobId, { text: null });
}

export function setIncluded(edits: Edits, jobIds: string[], included: boolean): Edits {
  return jobIds.reduce((next, jobId) => update(next, jobId, { included }), edits);
}

export function payloadText(edits: Edits, jobId: string, original: string): string {
  return getEdit(edits, jobId).text ?? original;
}

export function isEdited(edits: Edits, jobId: string): boolean {
  return getEdit(edits, jobId).text !== null;
}

export function isIncluded(edits: Edits, jobId: string): boolean {
  return getEdit(edits, jobId).included;
}

export type Inclusion = "none" | "some" | "all";

export function inclusion(jobs: Job[], edits: Edits): Inclusion {
  const count = jobs.filter((job) => isIncluded(edits, job.id)).length;
  if (count === 0) {
    return "none";
  }
  return count === jobs.length ? "all" : "some";
}

export type RetrySummary = {
  included: number;
  edited: number;
  /** Edited payloads that no longer parse. Export will refuse a batch containing any. */
  invalid: number;
};

export function retrySummary(jobs: Job[], edits: Edits): RetrySummary {
  const summary: RetrySummary = { included: 0, edited: 0, invalid: 0 };

  for (const job of jobs) {
    const edit = getEdit(edits, job.id);
    if (edit.included) {
      summary.included += 1;
    }
    if (edit.text !== null) {
      summary.edited += 1;
      if (!checkPayload(job, edit.text).ok) {
        summary.invalid += 1;
      }
    }
  }
  return summary;
}
