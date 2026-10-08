import type { Job } from "../types";

export type QueueCount = {
  queue: string;
  count: number;
};

export type GroupSummary = {
  count: number;
  queues: QueueCount[];
  maxAttempts: number;
  firstFailedAt: string;
  lastFailedAt: string;
};

export function summarizeJobs(jobs: Job[]): GroupSummary {
  const queueCounts = new Map<string, number>();
  let maxAttempts = 0;
  let first: { at: string; time: number } | null = null;
  let last: { at: string; time: number } | null = null;

  for (const job of jobs) {
    queueCounts.set(job.queue, (queueCounts.get(job.queue) ?? 0) + 1);
    maxAttempts = Math.max(maxAttempts, job.attempts);

    const time = Date.parse(job.failedAt);
    if (Number.isNaN(time)) {
      continue;
    }
    if (first === null || time < first.time) {
      first = { at: job.failedAt, time };
    }
    if (last === null || time > last.time) {
      last = { at: job.failedAt, time };
    }
  }

  const queues = [...queueCounts]
    .map(([queue, count]) => ({ queue, count }))
    .sort((a, b) => b.count - a.count || (a.queue < b.queue ? -1 : a.queue > b.queue ? 1 : 0));

  return {
    count: jobs.length,
    queues,
    maxAttempts,
    firstFailedAt: first?.at ?? "",
    lastFailedAt: last?.at ?? "",
  };
}
