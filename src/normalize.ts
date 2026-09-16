import { isRecord } from "./detect";
import type { LoadedRecord } from "./load";
import type { Job, Producer } from "./types";

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function asAttempts(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }
  return 0;
}

function readError(record: Record<string, unknown>): { errorClass: string; errorMessage: string } {
  const error = record.error;

  if (typeof error === "string") {
    return { errorClass: error, errorMessage: "" };
  }

  if (isRecord(error)) {
    return {
      errorClass: asString(error.class ?? error.type ?? error.name),
      errorMessage: asString(error.message ?? error.detail),
    };
  }

  return {
    errorClass: asString(record.errorClass ?? record.error_class),
    errorMessage: asString(record.errorMessage ?? record.error_message),
  };
}

function readPayload(record: Record<string, unknown>): { payload: unknown; payloadText: string } {
  const payload = "payload" in record ? record.payload : record;

  if (typeof payload === "string") {
    return { payload, payloadText: payload };
  }

  return { payload, payloadText: JSON.stringify(payload ?? null) };
}

/**
 * Builds a Job from a loaded record. `raw` keeps the untouched vendor object so
 * exports can read ids that the canonical model does not carry.
 */
export function normalizeGenericRecord(entry: LoadedRecord, producer: Producer = "generic"): Job {
  const { record, index } = entry;
  const { errorClass, errorMessage } = readError(record);
  const { payload, payloadText } = readPayload(record);

  return {
    id: asString(record.id ?? record.jid ?? record.MessageId) || `record-${index}`,
    queue: asString(record.queue ?? record.queue_name),
    producer,
    payload,
    payloadText,
    errorClass,
    errorMessage,
    attempts: asAttempts(record.attempts ?? record.retry_count),
    failedAt: asString(record.failedAt ?? record.failed_at),
    raw: record,
  };
}

export function normalizeRecords(entries: LoadedRecord[], producer: Producer = "generic"): Job[] {
  return entries.map((entry) => normalizeGenericRecord(entry, producer));
}
