import type { Job } from "../types";

/** The first job, in dump order, whose payload is the most repeated one in the group. */
export function pickSample(jobs: Job[]): Job {
  if (jobs.length === 0) {
    throw new Error("Cannot pick a sample from an empty group.");
  }

  const counts = new Map<string, number>();
  for (const job of jobs) {
    counts.set(job.payloadText, (counts.get(job.payloadText) ?? 0) + 1);
  }

  const top = Math.max(...counts.values());
  return jobs.find((job) => counts.get(job.payloadText) === top) ?? jobs[0];
}
