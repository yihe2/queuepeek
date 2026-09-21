import { isRecord } from "../detect";
import type { LoadedRecord } from "../load";
import type { Job } from "../types";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseJsonText(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function unwrapSnsEnvelope(payload: unknown): unknown {
  if (!isRecord(payload) || payload.Type !== "Notification" || typeof payload.Message !== "string") {
    return payload;
  }
  return parseJsonText(payload.Message);
}

function readBody(body: unknown): { payload: unknown; payloadText: string } {
  // Some export scripts write Body already parsed instead of as the raw string SQS returns.
  if (typeof body !== "string") {
    return { payload: body ?? null, payloadText: JSON.stringify(body ?? null) };
  }
  return { payload: unwrapSnsEnvelope(parseJsonText(body)), payloadText: body };
}

export function normalizeSqsRecord(entry: LoadedRecord): Job {
  const { record, index } = entry;
  const { payload, payloadText } = readBody(record.Body);

  return {
    id: text(record.MessageId) || `record-${index}`,
    queue: "",
    producer: "sqs",
    payload,
    payloadText,
    errorClass: "",
    errorMessage: "",
    attempts: 0,
    failedAt: "",
    raw: record,
  };
}
