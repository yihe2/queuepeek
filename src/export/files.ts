import { checkPayload, getEdit, type Edits } from "../edits";
import type { Job, Producer } from "../types";

export const EXPORT_FORMAT = "queuepeek-export";
export const EXPORT_VERSION = 1;

export type ExportRecord = {
  id: string;
  queue: string;
  producer: Producer;
  payload: unknown;
  edited: boolean;
  attempts: number;
  errorClass: string;
  errorMessage: string;
  failedAt: string;
};

export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  kind: "retry";
  /** File name of the dump the jobs came from. */
  source: string;
  exportedAt: string;
  count: number;
  records: ExportRecord[];
};

/** Thrown instead of writing a file that would retry a payload the operator left broken. */
export class ExportError extends Error {
  readonly jobIds: string[];

  constructor(message: string, jobIds: string[]) {
    super(message);
    this.name = "ExportError";
    this.jobIds = jobIds;
  }
}

function originalPayload(job: Job): unknown {
  return job.payload === undefined ? job.payloadText : job.payload;
}

/** Edited text is parsed back to JSON when the payload arrived as JSON; plain-text payloads stay text. */
function editedPayload(job: Job, text: string): unknown {
  if (typeof job.payload === "string" || job.payload === undefined) {
    return text;
  }
  return JSON.parse(text);
}

function toRecord(job: Job, edits: Edits): ExportRecord {
  const { text } = getEdit(edits, job.id);

  return {
    id: job.id,
    queue: job.queue,
    producer: job.producer,
    payload: text === null ? originalPayload(job) : editedPayload(job, text),
    edited: text !== null,
    attempts: job.attempts,
    errorClass: job.errorClass,
    errorMessage: job.errorMessage,
    failedAt: job.failedAt,
  };
}

export function buildRetryFile(source: string, jobs: Job[], edits: Edits, exportedAt: Date): ExportFile {
  const invalid = jobs.filter((job) => {
    const { text } = getEdit(edits, job.id);
    return text !== null && !checkPayload(job, text).ok;
  });
  if (invalid.length > 0) {
    const ids = invalid.map((job) => job.id);
    throw new ExportError(
      `${ids.length === 1 ? "1 job has" : `${ids.length} jobs have`} an edited payload that is not valid JSON: ${ids.join(", ")}.`,
      ids,
    );
  }

  const records = jobs.map((job) => toRecord(job, edits));
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    kind: "retry",
    source,
    exportedAt: exportedAt.toISOString(),
    count: records.length,
    records,
  };
}
