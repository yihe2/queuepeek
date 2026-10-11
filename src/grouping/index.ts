import type { Job } from "../types";
import { groupId } from "./ids";
import { normalizeMessage } from "./messages";
import { pickSample } from "./sample";
import { summarizeJobs, type GroupSummary } from "./summary";

export type ErrorGroup = GroupSummary & {
  id: string;
  errorClass: string;
  message: string;
  jobs: Job[];
  sample: Job;
};

type Bucket = { errorClass: string; message: string; jobs: Job[] };

function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function compareGroups(a: ErrorGroup, b: ErrorGroup): number {
  return b.count - a.count || compareText(a.errorClass, b.errorClass) || compareText(a.message, b.message);
}

export function groupJobs(jobs: Job[]): ErrorGroup[] {
  const buckets = new Map<string, Bucket>();

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

  return [...buckets.values()]
    .map(({ errorClass, message, jobs: members }) => ({
      id: groupId(errorClass, message),
      errorClass,
      message,
      jobs: members,
      sample: pickSample(members),
      ...summarizeJobs(members),
    }))
    .sort(compareGroups);
}

export function groupLabel(group: Pick<ErrorGroup, "errorClass" | "message">): string {
  if (group.errorClass !== "") {
    return group.errorClass;
  }
  return group.message === "" ? "(no error)" : "(no error class)";
}
