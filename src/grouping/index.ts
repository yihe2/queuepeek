import type { Job } from "../types";

export type ErrorGroup = {
  errorClass: string;
  jobs: Job[];
};

export function groupJobs(jobs: Job[]): ErrorGroup[] {
  const buckets = new Map<string, Job[]>();

  for (const job of jobs) {
    const errorClass = job.errorClass.trim();
    const bucket = buckets.get(errorClass);

    if (bucket) {
      bucket.push(job);
    } else {
      buckets.set(errorClass, [job]);
    }
  }

  return [...buckets].map(([errorClass, members]) => ({ errorClass, jobs: members }));
}

export function groupLabel(group: Pick<ErrorGroup, "errorClass">): string {
  return group.errorClass === "" ? "(no error)" : group.errorClass;
}
