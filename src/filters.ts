import type { Job } from "./types";

/** `null` means "any". Filters narrow the jobs before grouping, so counts in the sidebar follow them. */
export type JobFilter = {
  queue: string | null;
  errorClass: string | null;
  minAttempts: number;
  text: string;
};

export const emptyFilter: JobFilter = {
  queue: null,
  errorClass: null,
  minAttempts: 0,
  text: "",
};

export type FilterOptions = {
  queues: string[];
  classes: string[];
};

/** Case-insensitive substring match over the job id, error class, error message, and payload text. */
export function matchesText(job: Job, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  return [job.id, job.errorClass, job.errorMessage, job.payloadText].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

export function matchesFilter(job: Job, filter: JobFilter): boolean {
  if (filter.queue !== null && job.queue !== filter.queue) {
    return false;
  }
  if (filter.errorClass !== null && job.errorClass.trim() !== filter.errorClass) {
    return false;
  }
  if (job.attempts < filter.minAttempts) {
    return false;
  }
  return matchesText(job, filter.text);
}

export function filterJobs(jobs: Job[], filter: JobFilter): Job[] {
  return isFilterActive(filter) ? jobs.filter((job) => matchesFilter(job, filter)) : jobs;
}

export function isFilterActive(filter: JobFilter): boolean {
  return (
    filter.queue !== null || filter.errorClass !== null || filter.minAttempts > 0 || filter.text.trim() !== ""
  );
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
