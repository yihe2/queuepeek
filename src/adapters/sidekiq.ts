import { isRecord } from "../detect";
import type { LoadedRecord } from "../load";
import type { Job } from "../types";

const ACTIVE_JOB_WRAPPER = "ActiveJob::QueueAdapters::SidekiqAdapter::JobWrapper";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function jobClass(record: Record<string, unknown>): string {
  return text(record.wrapped) || text(record.class);
}

function jobArgs(record: Record<string, unknown>): unknown[] {
  const args = Array.isArray(record.args) ? record.args : [];
  const [first] = args;

  if (text(record.class) === ACTIVE_JOB_WRAPPER && isRecord(first) && Array.isArray(first.arguments)) {
    return first.arguments;
  }

  return args;
}

function attemptsFrom(record: Record<string, unknown>): number {
  const retryCount = record.retry_count;

  // Sidekiq sets retry_count to 0 on the first failure, so it trails executions by one.
  if (typeof retryCount === "number" && Number.isFinite(retryCount)) {
    return Math.max(0, Math.trunc(retryCount)) + 1;
  }

  return text(record.error_class) === "" ? 0 : 1;
}

function timestampToIso(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return text(value);
  }

  // Sidekiq 7 writes epoch milliseconds for some fields; older versions write float seconds.
  const date = new Date(value > 1e12 ? value : value * 1000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function normalizeSidekiqRecord(entry: LoadedRecord): Job {
  const { record, index } = entry;
  const payload = { class: jobClass(record), args: jobArgs(record) };

  return {
    id: text(record.jid) || `record-${index}`,
    queue: text(record.queue),
    producer: "sidekiq",
    payload,
    payloadText: JSON.stringify(payload),
    errorClass: text(record.error_class),
    errorMessage: text(record.error_message),
    attempts: attemptsFrom(record),
    failedAt: timestampToIso(record.failed_at),
    raw: record,
  };
}
