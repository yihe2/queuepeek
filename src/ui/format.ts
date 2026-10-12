import type { QueueCount } from "../grouping/summary";
import type { Job } from "../types";

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

/** UTC, minute precision. Unreadable timestamps are shown as-is so nothing is silently dropped. */
export function shortTime(value: string): string {
  if (value === "") {
    return "—";
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return value;
  }
  return new Date(time).toISOString().slice(0, 16).replace("T", " ");
}

export function payloadPreview(job: Job, max = 80): string {
  return truncate(job.payloadText.replace(/\s+/g, " ").trim(), max);
}

export function queueName(queue: string): string {
  return queue === "" ? "(no queue)" : queue;
}

export function queueSummary(queues: QueueCount[], max = 2): string {
  const names = queues.map(({ queue, count }) => (count > 1 ? `${queueName(queue)} ×${count}` : queueName(queue)));

  if (names.length <= max) {
    return names.join(", ");
  }
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}
