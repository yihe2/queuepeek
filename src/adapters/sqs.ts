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

function attribute(record: Record<string, unknown>, key: string): string {
  const attributes = record.Attributes;
  return isRecord(attributes) ? text(attributes[key]) : "";
}

function toCount(value: string): number {
  const parsed = Number(value);
  return value !== "" && Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function epochMillisToIso(value: string): string {
  const date = new Date(Number(value));
  return value !== "" && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
}

function queueName(urlOrArn: string): string {
  return urlOrArn.split(/[/:]/).filter(Boolean).pop() ?? "";
}

export function normalizeSqsRecord(entry: LoadedRecord): Job {
  const { record, index } = entry;
  const { payload, payloadText } = readBody(record.Body);

  return {
    id: text(record.MessageId) || `record-${index}`,
    queue: queueName(attribute(record, "DeadLetterQueueSourceArn") || text(record.QueueUrl)),
    producer: "sqs",
    payload,
    payloadText,
    errorClass: "",
    errorMessage: "",
    attempts: toCount(attribute(record, "ApproximateReceiveCount")),
    failedAt: epochMillisToIso(attribute(record, "SentTimestamp")),
    raw: record,
  };
}
