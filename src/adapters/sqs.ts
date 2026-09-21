import type { LoadedRecord } from "../load";
import type { Job } from "../types";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeSqsRecord(entry: LoadedRecord): Job {
  const { record, index } = entry;
  const body = text(record.Body);

  return {
    id: text(record.MessageId) || `record-${index}`,
    queue: "",
    producer: "sqs",
    payload: body,
    payloadText: body,
    errorClass: "",
    errorMessage: "",
    attempts: 0,
    failedAt: "",
    raw: record,
  };
}
