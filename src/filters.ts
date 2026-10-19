import type { Job } from "./types";

/** `null` means "any". Filters narrow the jobs before grouping, so counts in the sidebar follow them. */
export type JobFilter = {
  queue: string | null;
  errorClass: string | null;
  minAttempts: number;
};

export const emptyFilter: JobFilter = {
  queue: null,
  errorClass: null,
  minAttempts: 0,
};

export type FilterOptions = {
  queues: string[];
  classes: string[];
};

export function matchesFilter(job: Job, filter: JobFilter): boolean {
  if (filter.queue !== null && job.queue !== filter.queue) {
    return false;
  }
  if (filter.errorClass !== null && job.errorClass.trim() !== filter.errorClass) {
    return false;
  }
  return job.attempts >= filter.minAttempts;
}

export function filterJobs(jobs: Job[], filter: JobFilter): Job[] {
  return isFilterActive(filter) ? jobs.filter((job) => matchesFilter(job, filter)) : jobs;
}

export function isFilterActive(filter: JobFilter): boolean {
  return filter.queue !== null || filter.errorClass !== null || filter.minAttempts > 0;
}

function distinctSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Choices for the filter bar, taken from the whole dump rather than the filtered view. */
export function filterOptions(jobs: Job[]): FilterOptions {
  return {
    queues: distinctSorted(jobs.map((job) => job.queue)),
    classes: distinctSorted(jobs.map((job) => job.errorClass.trim())),
  };
}
