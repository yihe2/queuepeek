import type { Job } from "../types";
import { normalizeMessage } from "./messages";

export type ErrorGroup = {
  errorClass: string;
  message: string;
  jobs: Job[];
};

export function groupJobs(jobs: Job[]): ErrorGroup[] {
  const buckets = new Map<string, ErrorGroup>();

  for (const job of jobs) {
    const errorClass = job.errorClass.trim();
    const message = normalizeMessage(job.errorMessage);
    const key = `${errorClass}\u0000${message}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.jobs.push(job);
    } else {
      buckets.set(key, { errorClass, message, jobs: [job] });
    }
  }

  return [...buckets.values()];
}

export function groupLabel(group: Pick<ErrorGroup, "errorClass" | "message">): string {
  if (group.errorClass !== "") {
    return group.errorClass;
  }
  return group.message === "" ? "(no error)" : "(no error class)";
}
